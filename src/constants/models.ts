import { CHECK_CALENDAR_CAPABILITY, TELEGRAM_CAPABILITY } from '@constants/capabilities.js';
import type { MessageType, ModelDescriptor } from '@moonie-types/models.js';
import { IntentType } from '@moonie-types/state.js';

export const CHAT_POOL: ModelDescriptor[] = [
  // { provider: "ollama", model: "qwen3:8b" }, // Only for local tests
  { provider: 'gemini', model: 'gemini-3.6-flash' },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
];

export const EXTRACT_POOL: ModelDescriptor[] = [
  // { provider: "ollama", model: "qwen3:8b" }, // Only for local tests
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
  [TELEGRAM_CAPABILITY.intent]: TELEGRAM_CAPABILITY.handlerNode,
  [CHECK_CALENDAR_CAPABILITY.intent]: CHECK_CALENDAR_CAPABILITY.handlerNode,
  'unknown': 'handleUnknown',
  'cv-download': 'handleOther',
}