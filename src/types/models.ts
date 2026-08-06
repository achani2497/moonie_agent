import { ZodObject } from 'zod';

export type AvailableModels =
  | 'gemini-2.5-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.5-flash'
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.6-flash';

export type StructuredPayload = {
  schema: ZodObject;
  name: string;
};

export type Provider = 'gemini' | 'ollama';

export type ModelDescriptor = {
  provider: Provider;
  model: string;
  rpd: number;
};

export type Task = 'chat' | 'extraction';
