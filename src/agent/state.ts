import { BaseMessage } from "@langchain/core/messages"
import { Annotation } from "@langchain/langgraph"
import { MESSAGES_LIMIT } from '@constants/state.js'
import { AvailableLanguages, IntentType } from '@moonie-types/state.js'

export const moonieState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, curr) => prev.concat(curr),
        default: () => []
    }),
    lastIntent: Annotation<IntentType>({
        reducer: (_, curr) => curr,
        default: () => null
    }),
    messageLimit: Annotation<number>({
        reducer: (_, curr) => curr--,
        default: () => MESSAGES_LIMIT
    }),
    language: Annotation<AvailableLanguages>({
        reducer: (_, curr) => curr,
        default: () => "es"
    }),
    downloadLanguageRequested: Annotation<AvailableLanguages>({
        reducer: (_, curr) => curr,
        default: () => "es"
    }),
})