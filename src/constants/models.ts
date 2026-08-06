import type { ModelDescriptor } from '@moonie-types/models.js';

// Balanced pools (540 RPD each). RPD values are the user's real AI Studio quota numbers.
//
// For local dev, you can prepend ollama descriptors to use a local model first and fall
// back to the cloud pools when ollama is down. Example:
//
//   CHAT_POOL = [
//     { provider: "ollama", model: "qwen3:8b", rpd: Infinity },
//     ...CHAT_POOL,
//   ];
//
// (Set rpd: Infinity for local models — they have no daily quota.)

export const CHAT_POOL: ModelDescriptor[] = [
  { provider: 'gemini', model: 'gemini-3.6-flash', rpd: 20 },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite', rpd: 500 },
  { provider: 'gemini', model: 'gemini-2.5-flash', rpd: 20 },
];

export const EXTRACT_POOL: ModelDescriptor[] = [
  { provider: 'gemini', model: 'gemini-3.1-flash-lite', rpd: 500 },
  { provider: 'gemini', model: 'gemini-3.5-flash', rpd: 20 },
];
