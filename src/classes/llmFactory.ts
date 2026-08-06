import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AvailableModels, StructuredPayload } from '@moonie-types/models.js';
import { PROVIDERS } from '@classes/providers.js';

// All entries in AvailableModels are currently gemini models. We delegate to the PROVIDERS
// registry so the factory stays a thin convenience wrapper and never goes stale when new
// models are added to the union.
export class LLMFactory {
  public getModel(model: AvailableModels, temperature: number): BaseChatModel {
    return PROVIDERS['gemini']({ provider: 'gemini', model, rpd: 0 }, temperature);
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
