import type { MessageType, ModelDescriptor } from '@moonie-types/models.js';
import { IntentType } from '@moonie-types/state.js';

// For local dev, you can prepend ollama descriptors to use a local model first and fall
// back to the cloud pools when ollama is down. Example:
//
//   CHAT_POOL = [
//     { provider: "ollama", model: "qwen3:8b" },
//     ...CHAT_POOL,
//   ];

export const CHAT_POOL: ModelDescriptor[] = [
  { provider: 'gemini', model: 'gemini-3.6-flash' },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
];

export const EXTRACT_POOL: ModelDescriptor[] = [
  { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
  { provider: 'gemini', model: 'gemini-3.5-flash' },
];

export const MESSAGE_TYPE_TAG: Record<MessageType, string> = {
  ai: "ASSISTANT_MESSAGE",
  human: "USER_MESSAGE"
}

export const INTENT_TO_NODE: Record<Exclude<IntentType, null>, string> = {
  'cv-question': 'loadContext',
  'other': 'handleOther',
  'set-meeting': 'handleOther',
  'send-telegram-message': 'handleOther',
  'unknown': 'handleUnknown',
  'cv-download': 'handleOther', // cuando lo actives
}