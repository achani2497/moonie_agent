import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { AvailableModels, StructuredPayload } from '@moonie-types/models.js'
import { getGeminiLLM } from '@utils/llm.js'

const LLMs = {
    'gemini-2.5-flash': getGeminiLLM,
    'gemini-3.1-flash-lite': getGeminiLLM
}

export class LLMFactory {

    public getModel(model: AvailableModels, temperature: number): BaseChatModel {
        const llm = LLMs[model](model, temperature)
        return llm
    }

    public getStructuredModel(model: AvailableModels, temperature: number, structuredPayload: StructuredPayload) {
        const llm = LLMs[model](model, temperature)

        const structuredLLM = llm.withStructuredOutput(structuredPayload.schema, { name: structuredPayload.name }) // 'withStructuredOutput' fuerza al LLM a devolver un JSON que cumpla el esquema Zod
        return structuredLLM

    }

}