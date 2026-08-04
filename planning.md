### Definiciones
- Nombre del asistente: Moonie
- Personalidad: Amistosa, Calida, Profesional, Concisa
- Origen: Moonie nace a partir de Luna, mi perra, quien es una parte muy importante de mi vida
- Imagen: Perro chiquito mestizo, orejas paradas y puntiagudas, pelaje corto de color castaño-marron-negro-gris

### Features de cara al usuario
- **Crear citas en mi calendario**: Hacer que Moonie, una vez que el usuario define día y horario, pueda crear una cita en el calendario. Solo se va a permitir una cita por mail. Solo se va a permitir agendar una cita dentro de las proximas 2 semanas a partir del día en que el usuario esté hablando, ej: el usuario contacta a Moonie un 1 de julio, solo va a poder agendar citas hasta el 15 de julio inclusive.
    - Cuando cree el evento, también me va a mandar un mensaje por Telegram para avisarme de que se agendó una nueva reunion
- **Responder preguntas acerca de mi carrera profesional**: Moonie va a responder preguntas relacionadas a mi carrera profesional utilizando de contexto mi CV y otro archivo complemento.
    - También va a poder ofrecer la descarga del CV desde el chat

### Features para mi
- **Resumen de la semana**: Poder pedirle un resumen de lo que va a ser mi semana en término de reuniones, por ejemplo: Hoy es martes 1 de junio, yo le pregunto qué otras citas importantes me quedan durante la semana y que mediante una lista me diga dia por día qué cosas importantes tengo.
- **Aviso de mails RR**: Que me pueda responder si hay algun mail con RR dentro de la casilla de devecoop

## Decisiones técnicas

### Stack y arquitectura general
- **Package manager**: pnpm@9.0.0
- **Módulos**: ESM (`"type": "module"`)
- **Runtime**: Node.js + TypeScript 5 + tsx
- **Framework API**: Express 4
- **Lint/format**: ESLint 9 + typescript-eslint + Prettier
- **LLM**: Google Gemini (capa gratuita generosa)
- **Interfaz**: chat web incrustado en el portfolio (Astro + isla React).
- **Primer agente a implementar**: agente de CV / preguntas profesionales

### Agentes y datos
- **Vector store**: no por ahora. Se usa contexto completo inyectado en el prompt.
- **Fuentes de información del agente de CV**:
  - `/agents/data/cv.pdf` — CV parseado a texto en runtime.
  - `/agents/data/cv-complement.md` — información complementaria en Markdown.
  - `/agents/data/cv-en.pdf` — versión en inglés para descarga.
- **Descarga de CV**: se ofrecen dos versiones (español e inglés) desde el mismo conjunto de archivos.

### State del grafo (agente de CV)
- `messages`: historial de mensajes `user` / `assistant` de la sesión.
- `lastIntent`: `"cv-question" | "cv-download" | "other" | "unknown"` — última acción requerida por el usuario y selector de tool.
- `messageLimit`: cantidad máxima de mensajes permitidos por sesión (rate limiter).
- `language`: `"es" | "en"` — idioma detectado automáticamente por Moonie en el primer mensaje.
- `downloadLanguageRequested`: flag para saber si ya se ofreció descargar el CV y en qué idioma.

### Hosting y dominio
- **Backend**: AWS EC2 Free Tier (`t2.micro`/`t3.micro`) durante 12 meses, sin cold start.
- **Disco persistente**: EBS 30 GB incluido en free tier; suficiente para SQLite.
- **Dominio**: subdominio `api.alejandrochani.dev` apuntando a la IP pública de EC2.
  - El dominio principal (`alejandrochani.dev`) está registrado en DonWeb y el frontend está deployado en Vercel.
  - Los nameservers actualmente apuntan a Vercel, por lo que no se puede crear un registro `A` directo a EC2 desde Vercel.
  - **Solución elegida**: mover la gestión DNS a **Cloudflare gratis**, configurando `alejandrochani.dev` → Vercel y `api.alejandrochani.dev` → EC2.
- **HTTPS**: Let's Encrypt + Caddy/Nginx como reverse proxy en EC2.
- **CORS**: el backend debe permitir explícitamente el origen del portfolio en Vercel.

### Checkpointer / persistencia de conversaciones
- **Tecnología**: `SqliteSaver` nativo de LangGraph sobre un archivo SQLite en el volumen persistente de EC2.
- **Razón**: EC2 tiene disco persistente, por lo que no se justifica Turso ni otra DB remota en esta etapa.

### Seguridad (versión básica)
- **Datos personales**: se publicará una versión del CV sin teléfono, dirección ni DNI.
- **CAPTCHA**: en el frontend antes de iniciar el chat.
- **Origen de requests**: middleware CORS básico para restringir requests al dominio del portfolio. Capa contra abuso casual, no contra atacante determinado.
- **Rate limit**: por sesión mediante UUID seteado por el backend en una cookie `HttpOnly` `Secure` `SameSite=Lax`.
  - El frontend y backend comparten el mismo dominio principal (`alejandrochani.dev`), por lo que las cookies same-site son viables y más seguras que `localStorage`.
  - El UUID se genera en el backend con `crypto.randomUUID()` y se envía automáticamente en cada request.
- **DDoS**: no se cubre por ser overkill para una app chica personal.

### Modelo y prompts
- **Modelos**: Google Gemini dentro de la capa gratuita.
  - **Respuesta natural**: `gemini-2.5-flash` para presentación y respuestas al usuario (mejor redacción y razonamiento).
  - **Extracción estructurada**: `gemini-3.1-flash-lite-001` para extraer `name`, `email` y `reason` de los mensajes (más barato, suficiente para la tarea).
  - Alternativa: usar `gemini-2.5-flash` para ambos si se prefiere un solo modelo.
- **Temperature**: `0` para minimizar alucinaciones y mantener respuestas basadas estrictamente en el contexto.
- **Crédito de mensajes**: `15` preguntas por sesión.
- **Parser de PDF**: `pdf-parse` por ser el más simple y eficiente para este caso de uso.
- **Prompts**: cada funcionalidad tendrá su archivo dentro de `/prompts/` exportando constantes con los prompts.
- **System prompt**: se define como constantes dentro de `/prompts/` en la primera versión. Se puede migrar a archivos `.md` separados si crecen.
- **Output hacia el frontend**: tipos definidos en `types/StructuredOutput.ts`. Debe soportar respuestas de texto y opciones renderizables como botones (preparado para el futuro agente de calendario).

### Nodos del grafo del agente de CV
Se usa `conditionalEdge` para dirigir el flujo según `lastIntent` y el estado de `visitorInfo`.

1. **`subtractOneMessageLimit`**: verifica si se alcanzó el límite de mensajes. Si es así, responde despedida y corta.
2. **`generatePresentationResponse`**: genera la respuesta natural de Moonie (presentación + pedido de datos). Usa un LLM de texto libre siguiendo el patrón **Generation + Extraction**.
3. **`extractVisitorInfo`**: extrae estructuradamente `name`, `email` y `reason` del último mensaje del usuario. Los campos son opcionales/nullable para evitar que el LLM invente datos.
4. **`classifyIntent`**: clasifica el último mensaje del usuario en `cv-question`, `cv-download`, `other` o `unknown` usando Zod para output estructurado.
5. **`loadContext`**: lee `cv.pdf` y `cv-complement.md` on-demand y arma el contexto para el LLM.
6. **`answerCVQuestion`**: responde preguntas profesionales usando únicamente el contexto cargado.
7. **`offerCVDownload`**: ofrece descargar el CV preguntando si lo quiere en español o inglés.
8. **`resolveDownloadLanguage`**: interpreta la respuesta del usuario cuando elige idioma.
9. **`sendCVLink`**: devuelve el link al archivo `cv.pdf` o `cv-en.pdf` según el idioma elegido.
10. **`handleOther`**: responde amablemente que no puede ayudar con temas fuera del CV.
11. **`handleUnknown`**: pide amablemente que reformule la pregunta.

### Casos de uso del agente de CV

#### Caso 1: Primer contacto (faltan datos del visitante)
El usuario entra al chat y escribe "Hola".
- `subtractOneMessageLimit`
- `generatePresentationResponse`
- `extractVisitorInfo`
- Conditional edge: `visitorInfo` incompleto → `END` (espera próximo mensaje del usuario)

#### Caso 1b: Segundo turno completando datos
El usuario responde "Soy Juan, quiero agendar una reunión".
- `subtractOneMessageLimit`
- `generatePresentationResponse`
- `extractVisitorInfo`
- Conditional edge: `visitorInfo` incompleto → `END` (sigue pidiendo email)

#### Caso 1c: Datos completos
El usuario responde "juan@example.com".
- `subtractOneMessageLimit`
- `generatePresentationResponse`
- `extractVisitorInfo`
- Conditional edge: `visitorInfo` completo → `classifyIntent`

#### Caso 2: Pregunta sobre carrera profesional
El usuario ya se presentó y pregunta "¿Cuántos años de experiencia tenés?".
- `subtractOneMessageLimit`
- `classifyIntent`
- `loadContext`
- `answerCVQuestion`

#### Caso 3: Descarga del CV en español
El usuario dice "Quiero descargar tu CV" y luego responde "español".
- `subtractOneMessageLimit`
- `classifyIntent`
- `offerCVDownload`
- `resolveDownloadLanguage`
- `sendCVLink`

#### Caso 4: Pregunta fuera de alcance
El usuario pregunta "¿Cuál es la capital de Francia?".
- `subtractOneMessageLimit`
- `classifyIntent`
- `handleOther`

#### Caso 5: Mensaje incomprensible
El usuario escribe "asdfghjkl".
- `subtractOneMessageLimit`
- `classifyIntent`
- `handleUnknown`

#### Caso 6: Límite de mensajes alcanzado
El usuario envía un mensaje siendo que ya usó sus 15 preguntas.
- `subtractOneMessageLimit` (responde despedida y finaliza)

## TODOs técnicos pendientes
- [x] Definir modelo específico de Gemini y temperature.
- [x] Definir valor concreto de `messageLimit`.
- [x] Definir dónde estará hosteado el backend respecto al portfolio Astro.
- [x] Elegir librería para parsear el PDF.
- [x] Diseñar nodos del grafo del agente de CV.
- [x] Definir checkpointer: `SqliteSaver` local en EC2.
- [x] Confirmar estrategia de sesión: cookies `HttpOnly` `Secure` `SameSite=Lax` por compartir dominio principal (`alejandrochani.dev`).
- [ ] **Seguridad: análisis y mitigaciones contra prompt injection.**
- [ ] Configurar instancia AWS EC2 una vez validado el funcionamiento local.
- [ ] Configurar Cloudflare para gestionar DNS de `alejandrochani.dev` y apuntar `api.alejandrochani.dev` a EC2 (manteniendo el frontend en Vercel).
- [x] Definir comportamiento cuando se alcanza el límite de mensajes.
- [x] Definir estructura del endpoint de descarga del CV (`/download/cv/:lang`).