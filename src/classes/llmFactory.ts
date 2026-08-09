import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import type { AvailableModels, ModelDescriptor, Provider, StructuredPayload } from '@moonie-types/models.js';

export type ModelFactory = (descriptor: ModelDescriptor, temperature: number) => BaseChatModel;

export const PROVIDERS: Record<Provider, ModelFactory> = {
  gemini: (descriptor, temperature) => new ChatGoogleGenerativeAI({ model: descriptor.model, temperature }),
  ollama: (descriptor, temperature) => new ChatOllama({ model: descriptor.model, temperature }),
};
export class LLMFactory {
  public getModel(model: AvailableModels, temperature: number, provider: Provider = "gemini"): BaseChatModel {
    return PROVIDERS[provider]({ provider: 'gemini', model }, temperature);
  }

  public getStructuredModel(
    model: AvailableModels,
    temperature: number,
    structuredPayload: StructuredPayload,
  ) {
    const llm = this.getModel(model, temperature);

    const structuredLLM = llm.withStructuredOutput(structuredPayload.schema, {
      name: structuredPayload.name,
    }); // 'withStructuredOutput' fuerza al LLM a devolver un JSON que cumpla el esquema Zod
    return structuredLLM;
  }
}
