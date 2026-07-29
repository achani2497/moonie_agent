import { moonieState } from '@agent/state.js';
import { LLMFactory } from '@classes/llmFactory.js';


const llmFactory = new LLMFactory()
const llm = llmFactory.getModel('gemini-2.5-flash', 0.3);

export const presentationAndLanguageDetection = async (state: typeof moonieState.State) => {
    const systemMessage = {
        role: 'system',
        content: "Respondé con tu nombre que es Moonie y preguntale al usuario cómo está"
    }

    const response = await llm.invoke([systemMessage, ...state.messages])

    return { messages: [response] }
}

export const checkMessageLimit = (state: typeof moonieState.State) => {
    return { ...state }
}

export const classifyIntent = (state: typeof moonieState.State) => {
    return { ...state }
}

export const loadContext = (state: typeof moonieState.State) => {
    return { ...state }
}

export const answerCVQuestion = (state: typeof moonieState.State) => {
    return { ...state }
}

export const offerCVDownload = (state: typeof moonieState.State) => {
    return { ...state }
}

export const resolveDownloadLanguage = (state: typeof moonieState.State) => {
    return { ...state }
}

export const sendCVLink = (state: typeof moonieState.State) => {
    return { ...state }
}

export const handleOther = (state: typeof moonieState.State) => {
    return { ...state }
}

export const handleUnknown = (state: typeof moonieState.State) => {
    return { ...state }
}