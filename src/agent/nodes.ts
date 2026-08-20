import { moonieState } from '@agent/state.js';
import { modelPlanner } from '@classes/modelPlanner.js';
import { LimitReachedMessage, UnknownRequestMessage } from '@constants/messages.js';
import { MESSAGE_TYPE_TAG } from '@constants/models.js';
import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { deliverMessage, type ChatEventEmitter } from '@services/stream/chatStream.js';
import { emitNodeStatus } from '@services/stream/nodeStatus.js';
import { readFile } from '@utils/files.js';
import { getLastMessageFromType, getTaggedMessagesFromType } from '@utils/state.js';
import { intentSchema, presentationSchema } from '../schemas/presentation.js';
import {
  classifierPrompt,
  cvContextData,
  cvQuestionAnswerPrompt,
  handleOtherRequestsPrompt,
  presentationParamExtractionPrompt,
  presentationPrompt,
  presentationPromptAfterFirstMessage
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

        ${state.moonieHasAlreadyPresented ? presentationPromptAfterFirstMessage : presentationPrompt}
    `;

  const systemMessage = {
    role: 'system',
    content: prompt,
  };

  // uso deliverMessage para los nodos que generen alguna respuesta al usuario
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  const response = await deliverMessage(chatEventEmitter, 'chat', [systemMessage, ...state.messages]);

  return { messages: [response], moonieHasAlreadyPresented: true };
};

export const EXTRACT_visitorInfo = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  emitNodeStatus(chatEventEmitter, 'EXTRACT_visitorInfo');

  const lastHumanMessage = getTaggedMessagesFromType('human', state);
  const oldMessages = lastHumanMessage.map((taggedMessage) => ({
    role: 'user',
    content: taggedMessage,
  }));

  const { name, email, reason, language } = await modelPlanner.invokeStructured(
    'extraction',
    { name: 'presentation_schema', schema: presentationSchema },
    [{ role: 'system', content: presentationParamExtractionPrompt }, ...oldMessages],
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
  return { messageLimit: state.messageLimit - 1 };
};

export const classifyIntent = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  emitNodeStatus(chatEventEmitter, 'classifyIntent');

  const messageToClassify =
    state.visitorInfo.reason && state.lastIntent === null ? state.visitorInfo.reason : getLastMessageFromType('human', state);
  const lastAiMessage = getLastMessageFromType('ai', state) ?? ''

  if (typeof messageToClassify !== 'string') return { lastIntent: 'unknown' };

  const HUMAN_TAG = MESSAGE_TYPE_TAG['human']
  const AI_TAG = MESSAGE_TYPE_TAG['ai']

  const response = await modelPlanner.invokeStructured(
    'extraction',
    { name: 'intent_schema', schema: intentSchema },
    [
      { role: 'system', content: classifierPrompt },
      { role: 'user', content: `<${AI_TAG}>${lastAiMessage}</${AI_TAG}>` },
      { role: 'user', content: `<${HUMAN_TAG}>${messageToClassify}</${HUMAN_TAG}>` },
    ],
  );

  console.log(response.intent);

  return { lastIntent: response.intent };
};

export const loadContext = async (state: typeof moonieState.State) => {
  if (state.cvLoaded) return {}

  const cvInfo = readFile('cv.md')
  const complementInfo = readFile('complement.md')

  const cvContent = cvContextData(cvInfo, complementInfo)

  return { cvContent, cvLoaded: true };
};

export const answerCVQuestion = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const systemMessage = new SystemMessage(`${state.cvContent}\n\n${cvQuestionAnswerPrompt}`);

  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;
  const response = await deliverMessage(chatEventEmitter, 'chat', [systemMessage, ...state.messages]);

  return { messages: [response] };
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

export const handleOther = async (state: typeof moonieState.State, config: RunnableConfig) => {
  const chatEventEmitter = config.configurable?.streamHandler as ChatEventEmitter | undefined;

  const otherIntentionPrompt = new SystemMessage(handleOtherRequestsPrompt);

  const response = await deliverMessage(chatEventEmitter, 'chat', [otherIntentionPrompt, ...state.messages])

  return { messages: [response] };
};

export const handleUnknown = (state: typeof moonieState.State, config: RunnableConfig) => {
  const streamHandler = config.configurable?.streamHandler as ChatEventEmitter | undefined;

  const mockedUnknownIntentionMessage = new AIMessage({ content: UnknownRequestMessage });

  streamHandler?.streamMessageChunk(UnknownRequestMessage)
  return { messages: [mockedUnknownIntentionMessage] };
};

export const sendMessageLimitExceeded = (state: typeof moonieState.State, config: RunnableConfig) => {
  const streamHandler = config.configurable?.streamHandler as ChatEventEmitter | undefined;

  const mockedLimitReachedMessage = new AIMessage({ content: LimitReachedMessage });

  streamHandler?.streamMessageChunk(LimitReachedMessage);
  return { messages: [mockedLimitReachedMessage] };
};
