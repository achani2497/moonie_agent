import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AvailableModels } from '@moonie-types/models.js';

export const getGeminiLLM = (model: AvailableModels, temperature: number) => {
    return new ChatGoogleGenerativeAI({ model, temperature })
}