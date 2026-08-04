# Plan de Implementación de Streaming

## Objetivo

Pasar la API de chat de Moonie de una respuesta JSON síncrona a una respuesta en streaming (Server-Sent Events). El frontend debería ver los tokens a medida que se generan y recibir actualizaciones de estado mientras el agente de LangGraph se mueve entre nodos. Esto hace que la asistente se sienta viva y le da al usuario feedback inmediato durante los pasos silenciosos de extracción y clasificación.

## Por qué ahora

- El nodo de presentación ya funciona. El streaming es la mejora natural de UX.
- Agregarlo más tarde obligaría a tocar el endpoint, el frontend y todos los nodos futuros al mismo tiempo.
- Implementar la infraestructura ahora permite que cada nuevo nodo (respuesta de CV, agendamiento, notificación de Telegram) tenga streaming y feedback de estado gratis.

## No-objetivos

- Streaming multimodal (imágenes/audio). El plan es solo texto.
- WebSockets. Vamos a usar SSE porque es más simple, funciona sobre HTTP y se ajusta a nuestro modelo de requests sin estado.

## Contrato de eventos del frontend

El backend emite un único stream de eventos JSON separados por saltos de línea. El frontend siempre consume la misma forma.

```ts
type ChatEvent =
  | { type: 'status'; status: string }
  | { type: 'token'; content: string }
  | { type: 'options'; options: Option[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

type Option = {
  label: string
  value: string
  action: 'download-cv' | 'schedule-meeting' | 'open-calendar'
}
```

### Semántica de los eventos

- `status`: un mensaje corto y amistoso que se muestra mientras el backend trabaja. Puede ser reemplazado por el siguiente `status` o borrado cuando llegue un `token` o `options`.
- `token`: un fragmento del mensaje final del asistente. El frontend lo va agregando a la burbuja actual.
- `options`: botones que se muestran después del mensaje del asistente. Se usan para descargar el CV, agendar una reunión, etc.
- `done`: el stream terminó. El frontend puede volver a habilitar el input.
- `error`: algo salió mal. El frontend debería mostrar un mensaje de fallback y volver a habilitar el input.

## Visión general de la arquitectura

```
Frontend                     Backend
   |                            |
   | POST /api/chat (SSE)       |
   |--------------------------->|
   |                            | ChatStreamRunner
   |<--- status: Presenting ---|         |
   |                            | subtractOneMessageLimit
   |                            | presentationAndLanguageDetection
   |<--- token: Hola ---        |         |
   |<--- token: soy ---         |         |
   |<--- token: Moonie...       |         |
   |                            | EXTRACT_visitorInfo
   |<--- status: Taking note ---|         |
   |                            | classifyIntent
   |<--- status: Deciding... ---|         |
   |<--- done ------------------|         |
```

## Abstracciones del backend

### 1. ChatEventFormatter

Una única fuente de verdad para la forma de los eventos que se envían al frontend. Convierte datos internos en el contrato público de `ChatEvent`.

```ts
// src/services/stream/chatEventFormatter.ts
export const ChatEventFormatter = {
  status: (status: string): ChatEvent => ({ type: 'status', status }),
  token: (content: string): ChatEvent => ({ type: 'token', content }),
  options: (options: Option[]): ChatEvent => ({ type: 'options', options }),
  done: (): ChatEvent => ({ type: 'done' }),
  error: (message: string): ChatEvent => ({ type: 'error', message })
}
```

### 2. NodeStatusMapper

Mapea los nombres de los nodos de LangGraph a mensajes de estado amigables y un poco humorísticos para mostrar al usuario. Tener esto en un archivo separado permite cambiar el copy sin tocar la lógica de los nodos.

```ts
// src/services/stream/nodeStatusMapper.ts
export const nodeStatusMapper: Record<string, string> = {
  subtractOneMessageLimit:
    'Contando cuántos mensajes te quedan... todavía no te cobramos, tranquilo.',
  presentationAndLanguageDetection:
    'Presentándome... a ver si me acuerdo mi nombre.',
  EXTRACT_visitorInfo: 'Tomando nota de quién sos... no me olvido de vos, lo prometo.',
  classifyIntent: 'Decidiendo qué camino tomar... como un GPS, pero con más café.',
  answerCVQuestion: 'Revolviendo el cerebro de Ale... hay muchos commits por acá.',
  offerCVDownload: 'Preparando el CV... eligiendo la fuente más linda.',
  sendCVLink: 'Descargando el CV... no, todavía no es un PDF de gatitos.',
  scheduleMeeting: 'Agendando reunión con Ale... espero que no esté en modo focus.',
  notifyTelegram: 'Avisando a Ale por Telegram... con suerte no lo despierto.',
  handleOther: 'Esto no lo vi venir... dame un segundo que lo pienso.',
  handleUnknown: 'Hmm, esto no va conmigo... no me pidas que recete aspirinas.'
}
```

### 3. ToolStatusTracker

Para las tools futuras, vamos a necesitar mensajes de inicio y fin. Este mapeador permite mostrar progreso mientras una tool se ejecuta.

```ts
// src/services/stream/toolStatusTracker.ts
export const toolStatusTracker: Record<string, { start: string; end: string }> = {
  scheduleMeeting: {
    start: 'Agendando reunión con Ale...',
    end: 'Reunión agendada. Ya deberías recibir un mail.'
  },
  notifyTelegram: {
    start: 'Avisando a Ale por Telegram...',
    end: 'Ale ya fue notificado.'
  }
}
```

### 4. StreamResponseHandler

Un wrapper fino alrededor del objeto `Response` de HTTP. Se inyecta en el grafo vía `configurable` para que los nodos puedan emitir tokens sin saber nada de HTTP.

```ts
// src/services/stream/streamResponseHandler.ts
export class StreamResponseHandler {
  constructor(private response: Response) {}

  emit(event: ChatEvent) {
    this.response.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  status(status: string) {
    this.emit(ChatEventFormatter.status(status))
  }

  token(content: string) {
    this.emit(ChatEventFormatter.token(content))
  }

  options(options: Option[]) {
    this.emit(ChatEventFormatter.options(options))
  }

  done() {
    this.emit(ChatEventFormatter.done())
  }

  error(message: string) {
    this.emit(ChatEventFormatter.error(message))
  }
}
```

### 5. ChatStreamRunner

El orquestador principal. Ejecuta el grafo, escucha `streamEvents`, mapea los eventos a eventos del frontend y se asegura de cerrar el stream correctamente.

```ts
// src/services/stream/chatStreamRunner.ts
export class ChatStreamRunner {
  constructor(
    private graph: CompiledGraph,
    private response: Response
  ) {}

  async run(input: GraphInput, config: GraphConfig) {
    this.response.setHeader('Content-Type', 'text/event-stream')
    this.response.setHeader('Cache-Control', 'no-cache')
    this.response.setHeader('Connection', 'keep-alive')

    const handler = new StreamResponseHandler(this.response)

    try {
      const stream = await this.graph.streamEvents(input, {
        ...config,
        version: 'v2'
      })

      for await (const event of stream) {
        this.handleEvent(event, handler)
      }

      handler.done()
    } catch (error) {
      handler.error(this.formatError(error))
    } finally {
      this.response.end()
    }
  }

  private handleEvent(event: StreamEvent, handler: StreamResponseHandler) {
    switch (event.event) {
      case 'on_chain_start':
        this.emitNodeStatus(event.name, handler)
        break

      case 'on_llm_stream':
        const token = event.data?.chunk?.content
        if (token) handler.token(token)
        break

      case 'on_tool_start':
        this.emitToolStart(event.name, handler)
        break

      case 'on_tool_end':
        this.emitToolEnd(event.name, handler)
        break
    }
  }

  private emitNodeStatus(nodeName: string, handler: StreamResponseHandler) {
    const status = nodeStatusMapper[nodeName]
    if (status) handler.status(status)
  }

  private emitToolStart(toolName: string, handler: StreamResponseHandler) {
    const tool = toolStatusTracker[toolName]
    if (tool) handler.status(tool.start)
  }

  private emitToolEnd(toolName: string, handler: StreamResponseHandler) {
    const tool = toolStatusTracker[toolName]
    if (tool) handler.status(tool.end)
  }

  private formatError(error: unknown): string {
    if (error instanceof LLMTimeoutError) {
      return 'Moonie se quedó pensando demasiado. ¿Reintentamos?'
    }
    return 'Ups, algo se rompió. Volvé a intentar en un momento.'
  }
}
```

### 6. GraphInputBuilder

Construye el estado inicial a partir del request entrante y la sesión persistida.

```ts
// src/services/graph/graphInputBuilder.ts
export const buildGraphInput = (
  message: string,
  session: ChatSession
): GraphInput => ({
  messages: [new HumanMessage(message)],
  visitorInfo: session.visitorInfo ?? { name: null, email: null, reason: null },
  messageLimit: session.messageLimit ?? MESSAGES_LIMIT,
  lastIntent: null,
  language: session.language ?? 'es'
})
```

## Cambios en el endpoint

El endpoint deja de devolver JSON y empieza a hacer streaming.

```ts
// src/routes/chat.ts
app.post('/api/chat', async (req, res) => {
  const session = await getSession(req)
  const input = buildGraphInput(req.body.message, session)

  const runner = new ChatStreamRunner(moonieGraph, res)

  await runner.run(input, {
    configurable: { thread_id: session.threadId }
  })
})
```

## Cambios en los nodos

### Nodos generadores

Los nodos generadores (presentación, answerCVQuestion, handleOther, handleUnknown) deberían usar el método `stream` del modelo para que los tokens fluyan a través del grafo como eventos.

```ts
export const presentationAndLanguageDetection = async (
  state: typeof moonieState.State,
  config: RunnableConfig
) => {
  const handler = config.configurable?.streamHandler as StreamResponseHandler | undefined

  const prompt = buildPresentationPrompt(state)
  const systemMessage = new SystemMessage(prompt)

  const stream = await llm.stream([systemMessage, ...state.messages])

  let fullContent = ''

  for await (const chunk of stream) {
    const token = typeof chunk.content === 'string' ? chunk.content : ''
    fullContent += token
    handler?.token(token)
  }

  return { messages: [new AIMessage(fullContent)] }
}
```

**Importante:** si se usa `streamEvents` a nivel del runner, el nodo también podría usar `llm.invoke` y aún así emitir tokens a través de los eventos `on_llm_stream` del runner. El enfoque explícito con `streamHandler` es opcional y le da más control al nodo. Elegir un patrón y mantenerlo.

### Nodos silenciosos

Los nodos de extracción y clasificación no producen texto visible para el usuario. De todas formas deben reportar progreso. Opciones:

1. Dejar que el runner emita el estado automáticamente vía `on_chain_start` (recomendado).
2. Emitir un estado personalizado desde el nodo vía `streamHandler`.

El enfoque automático es preferido porque mantiene la lógica de los nodos limpia y el copy en un solo lugar.

### Nodos que devuelven options

Cuando un nodo necesita mostrar botones, puede emitir un evento options.

```ts
export const offerCVDownload = async (
  state: typeof moonieState.State,
  config: RunnableConfig
) => {
  const handler = config.configurable?.streamHandler as StreamResponseHandler | undefined

  const message = new AIMessage('¿Querés descargar el CV en español o en inglés?')
  handler?.token(message.content as string)

  handler?.options([
    { label: 'CV en español', value: 'cv-es', action: 'download-cv' },
    { label: 'CV en inglés', value: 'cv-en', action: 'download-cv' }
  ])

  return { messages: [message] }
}
```

## Cambios en el frontend

Un consumidor mínimo del stream SSE.

```ts
async function sendMessage(message: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const event: ChatEvent = JSON.parse(line.slice(6))

      switch (event.type) {
        case 'status':
          showStatus(event.status)
          break
        case 'token':
          appendToken(event.content)
          break
        case 'options':
          showOptions(event.options)
          break
        case 'done':
          finalizeMessage()
          break
        case 'error':
          showError(event.message)
          break
      }
    }
  }
}
```

## Preguntas abiertas

1. ¿Stream directamente desde `llm.stream` en cada nodo, o confiar en `streamEvents` desde el runner? `streamEvents` es más limpio pero puede tener un poco más de latencia. Habría que medir ambos.
2. ¿Cómo manejamos el request inicial que no tiene mensajes previos? El nodo `subtractOneMessageLimit` va a decrementar el límite. Tenemos que asegurarnos de que el primer mensaje muestre la presentación inmediatamente.
3. ¿Queremos un indicador de `thinking` mientras el LLM genera, o alcanza con el primer token? Un evento `status` antes de que empiece el LLM es barato y mejora la UX.
4. ¿Persistimos `messageLimit` por sesión o por thread? Hoy está en el state, así que el checkpointer lo maneja.

## Pasos de implementación

1. Agregar `ChatEventFormatter`, `StreamResponseHandler`, `NodeStatusMapper`, `ToolStatusTracker` y `ChatStreamRunner`.
2. Agregar `GraphInputBuilder` para centralizar la construcción del estado inicial.
3. Actualizar el endpoint `/api/chat` para usar `ChatStreamRunner`.
4. Actualizar el frontend para consumir eventos SSE.
5. Convertir los nodos generadores a una salida compatible con streaming.
6. Agregar tests para el contrato del stream (runner mockeado y verificación de stream real).
7. Documentar el contrato final de eventos en la documentación de la API.

## Riesgos

- **Manejo de timeouts:** nodos de larga duración (por ejemplo, la tool de calendario) pueden dejar la conexión abierta. Hay que usar un timeout en el runner y emitir un evento de error.
- **Ordenamiento del estado:** si un nodo emite tokens antes de actualizar el state, un crash puede duplicar la salida. Siempre acumular los tokens en el mensaje final antes de retornar.
- **Buffering de proxies:** algunos proxies inversos (por ejemplo, Nginx, Cloudflare) bufferizan SSE. Puede ser necesario deshabilitar el buffering o hacer flush explícito de los headers.
