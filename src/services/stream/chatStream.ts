import { AllModelsUnavailableError } from '@classes/customError.js';
import { modelPlanner } from '@classes/modelPlanner.js';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import type { CompiledGraphType } from '@langchain/langgraph';
import type { Task } from '@moonie-types/models.js';
import { Response } from 'express';

// Tipo de eventos que se emiten al front
export type ChatEvent =
  | { type: 'status'; status: string }
  | { type: 'messageChunk'; content: string }
  | { type: 'options'; options: Option[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

// Tipo de acciones que el front puede renderizar como Buttons
export type Option = {
  label: string;
  value: string;
  action: 'download-cv' | 'schedule-meeting' | 'open-calendar';
};

// Handler de emisión: construye el objeto que emite eventos de chat al front
export const createChatEventEmitter = (response: Response) => {
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

  return {
    setHeaders,
    emitStatus: (status: string) => emit({ type: 'status', status }),
    streamMessageChunk: (content: string) => emit({ type: 'messageChunk', content }),
    emitOptions: (options: Option[]) => emit({ type: 'options', options }),
    emitDone: () => emit({ type: 'done' }),
    emitError: (message: string) => emit({ type: 'error', message }),
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
    await graph.invoke(input, {
      ...config,
      signal: abortController.signal,
      configurable: {
        ...config.configurable,
        streamHandler: chatEventEmitter,
      },
    });
    chatEventEmitter.emitDone();
  } catch (error) {
    // Si el cliente ya se fue, no tiene sentido escribirle el error.
    if (!response.destroyed && !response.writableEnded) {
      chatEventEmitter.emitError(formatStreamError(error));
    }
  } finally {
    clearInterval(heartbeat);
    response.removeListener('close', onClose);
    response.end();
  }
};

const formatStreamError = (error: unknown): string => {
  if (error instanceof AllModelsUnavailableError) {
    return 'Uy, Moonie está teniendo problemas técnicos en este momento. Volvé a intentar en un ratito!';
  }
  return 'Ups, algo se rompió. Volvé a intentar en un momento.';
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
