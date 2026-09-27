import { moonieState } from '@agent/state.js';
import { AllModelsUnavailableError } from '@classes/customError.js';
import { modelPlanner } from '@classes/modelPlanner.js';
import { GenericErrorMessage, NoAvailableModelMessage, SLOW_STATUS_MESSAGES } from '@constants/messages.js';
import type { OptionAction } from '@constants/chat.js';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import type { CompiledGraphType } from '@langchain/langgraph';
import type { Task } from '@moonie-types/models.js';
import { Response } from 'express';

// Tipo de eventos que se emiten al front
type ChatEvent =
  | { type: 'status'; status: string }
  | { type: 'messageChunk'; content: string }
  | { type: 'options'; options: Option[] }
  | { type: 'done', messageLimit?: number }
  | { type: 'error'; message: string };

// Tipo de acciones que el front puede renderizar como Buttons
type Option = {
  label: string;
  value: string;
  action: OptionAction;
};

// Handler de emisión: construye el objeto que emite eventos de chat al front
export const createChatEventEmitter = (response: Response) => {
  let slowTimer: ReturnType<typeof setTimeout> | undefined;

  const setHeaders = () => {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // nginx: desactiva buffering explícito
    response.flushHeaders(); // sin esto los proxies bufferizan y el cliente no ve tokens
  };

  const emit = (event: ChatEvent) => {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const clearSlowTimer = () => {
    if (slowTimer) { clearTimeout(slowTimer); slowTimer = undefined; }
  };

  const armSlowTimer = () => {
    clearSlowTimer(); // reiniciar por si otro nodo mudo emite status
    slowTimer = setTimeout(() => {
      slowTimer = undefined;
      const phrase = SLOW_STATUS_MESSAGES[Math.floor(Math.random() * SLOW_STATUS_MESSAGES.length)];
      emit({ type: 'status', status: phrase });
    }, 5000);
  };

  return {
    setHeaders,
    emitStatus: (status: string) => emit({ type: 'status', status }),
    streamMessageChunk: (content: string) => emit({ type: 'messageChunk', content }),
    emitOptions: (options: Option[]) => emit({ type: 'options', options }),
    emitDone: (messageLimit?: number) => emit({ type: 'done', messageLimit }),
    emitError: (message: string) => emit({ type: 'error', message }),
    dispose: clearSlowTimer,
    armSlowTimer
  };
};

export type ChatEventEmitter = ReturnType<typeof createChatEventEmitter>;

export type GraphInput = { messages: BaseMessage[] };

// Ciclo de vida del stream: prepara headers, aborta si el cliente se va, manda heartbeat, corre el grafo y cierra.
export const runChatStream = async (
  graph: CompiledGraphType,
  response: Response,
  input: GraphInput,
  config: RunnableConfig,
) => {
  const chatEventEmitter = createChatEventEmitter(response);

  chatEventEmitter.setHeaders();

  const abortController = new AbortController();
  const onClose = () => abortController.abort();
  response.on('close', onClose);

  // Heartbeat para mantener vivo el websocket en caso de que la respuesta del LLM tarde mucho
  const heartbeat = setInterval(() => response.write(': ping\n\n'), 15000);

  try {
    const result: typeof moonieState.State = await graph.invoke(input, {
      ...config,
      signal: abortController.signal,
      configurable: {
        ...config.configurable,
        streamHandler: chatEventEmitter,
      },
    });
    chatEventEmitter.emitDone(result.messageLimit);
  } catch (error) {
    console.error('[runChatStream] Error al correr el grafo:', error);
    // Si el cliente ya se fue, no tiene sentido escribirle el error.
    if (!response.destroyed && !response.writableEnded) {
      chatEventEmitter.emitError(formatStreamError(error));
    }
  } finally {
    clearInterval(heartbeat);
    chatEventEmitter.dispose()
    response.removeListener('close', onClose);
    response.end();
  }
};

const formatStreamError = (error: unknown): string => {
  if (error instanceof AllModelsUnavailableError) {
    return NoAvailableModelMessage;
  }
  return GenericErrorMessage;
};

// Los nodos generadores usan esta abstracción para no repetir la lógica en cada nodo. Sirve para:
// - JSON (chatEventEmitter undefined): le pide la respuesta entera al planner (usa invoke).
// - SSE (chatEventEmitter presente): el planner va generando los tokens y se van acumulando en el mensaje final Y mientras se streamea al front (chatEventEmitter.streamMessageChunk).
export const deliverMessage = async (
  chatEventEmitter: ChatEventEmitter | undefined,
  task: Task,
  messages: (BaseMessage | { role: string; content: string })[],
  temperature = 0,
): Promise<BaseMessage> => {
  if (!chatEventEmitter) {
    return modelPlanner.invoke(task, messages, temperature);
  }

  const fullContent = await modelPlanner.generateTokens(task, messages, temperature, (generatedToken) => {
    chatEventEmitter.streamMessageChunk(generatedToken);
  });

  return new AIMessage(fullContent);
};
