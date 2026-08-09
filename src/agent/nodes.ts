import { moonieState } from '@agent/state.js';
import { modelPlanner } from '@classes/modelPlanner.js';
import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { deliverMessage, type ChatEventEmitter } from '@services/stream/chatStream.js';
import { emitNodeStatus } from '@services/stream/nodeStatus.js';
import { getLastHumanMessage, getTaggedHumanMessages } from '@utils/state.js';
import { intentSchema, presentationSchema } from '../schemas/presentation.js';
import {
  classifierPrompt,
  presentationParamExtractionPrompt,
  presentationPrompt,
} from './prompts/personal.js';

export const presentationAndLanguageDetection = async (
  state: typeof moonieState.State,
  config: RunnableConfig,
) => {

  const prompt = `
        Datos actuales del visitante:
        - Nombre: ${state.visitorInfo.name || 'no proporcionado'}
        - Email: ${state.visitorInfo.email || 'no proporcionado'}
        - Motivo: ${state.visitorInfo.reason || 'no proporcionado'}

        ${presentationPrompt}

        Si ya tenés alguno de estos datos, no lo vuelvas a pedir. Pedí amablemente los que falten.
    `;

  const systemMessage = {
    role: 'system',
    content: prompt,
  };

  // uso deliverMessage para los nodos que generen alguna respuesta al usuario
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  const response = await deliverMessage(chatEventEmitter, 'chat', [systemMessage, ...state.messages]);

  return { messages: [response] };
};

export const EXTRACT_visitorInfo = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  emitNodeStatus(chatEventEmitter, 'EXTRACT_visitorInfo');

  const lastHumanMessage = getTaggedHumanMessages(state);
  const oldMessages = lastHumanMessage.map((taggedMessage) => ({
    role: 'user',
    content: taggedMessage,
  }));

  const { name, email, reason, language } = await modelPlanner.invokeStructured(
    'extraction',
    { name: 'presentation_schema', schema: presentationSchema },
    [{ role: 'system', content: presentationParamExtractionPrompt }, ...oldMessages],
  );

  console.log(
    (name || state.visitorInfo.name) &&
      (email || state.visitorInfo.email) &&
      (reason || state.visitorInfo.reason) &&
      (language || state.language)
      ? `Info completa del user! ${name || state.visitorInfo.name} ${email || state.visitorInfo.email} ${reason || state.visitorInfo.reason} ${language || state.language}`
      : `Hasta ahora tengo ${name || state.visitorInfo.name} ${email || state.visitorInfo.email} ${reason || state.visitorInfo.reason} ${language || state.language}`,
  );

  return {
    visitorInfo: {
      name: name || state.visitorInfo.name,
      email: email || state.visitorInfo.email,
      reason: reason || state.visitorInfo.reason,
    },
    language: language || state.language || 'en',
  };
};

export const subtractOneMessageLimit = (state: typeof moonieState.State) => {
  console.log(`Nuevo limite de mensajes: ${state.messageLimit - 1}`);
  return { messageLimit: state.messageLimit - 1 };
};

export const classifyIntent = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  emitNodeStatus(chatEventEmitter, 'classifyIntent');

  const lastHumanMessage = getLastHumanMessage(state);

  if (typeof lastHumanMessage !== 'string') return { lastIntent: 'unknown' };

  const response = await modelPlanner.invokeStructured(
    'extraction',
    { name: 'intent_schema', schema: intentSchema },
    [
      { role: 'system', content: classifierPrompt },
      { role: 'user', content: `<USER_MESSAGE>${lastHumanMessage}</USER_MESSAGE>` },
    ],
  );

  console.log(response.intent);

  return { lastIntent: response.intent };
};

export const loadContext = (state: typeof moonieState.State) => {
  return { ...state };
};

export const answerCVQuestion = (state: typeof moonieState.State) => {
  return { ...state };
};

export const offerCVDownload = (state: typeof moonieState.State) => {
  return { ...state };
};

export const resolveDownloadLanguage = (state: typeof moonieState.State) => {
  return { ...state };
};

export const sendCVLink = (state: typeof moonieState.State) => {
  return { ...state };
};

export const handleOther = (state: typeof moonieState.State) => {
  return { ...state };
};

export const handleUnknown = (state: typeof moonieState.State) => {
  return { ...state };
};

export const sendMessageLimitExceeded = () => {
  const mockedLimitReachedMessage = new AIMessage({
    content:
      'Lo siento! Alcanzaste el limite de mensajes permitidos en el día. Volvé mañana para conocer un poco mas de Ale!',
  });

  return { messages: [mockedLimitReachedMessage] };
};
