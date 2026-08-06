import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ModelDescriptor } from '@moonie-types/models.js';

export type ModelFactory = (descriptor: ModelDescriptor, temperature: number) => BaseChatModel;

export const PROVIDERS: Record<string, ModelFactory> = {
  gemini: (d, t) => new ChatGoogleGenerativeAI({ model: d.model, temperature: t }),
  ollama: (d, t) => new ChatOllama({ model: d.model, temperature: t }),
};
