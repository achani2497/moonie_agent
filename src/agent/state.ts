import { MESSAGES_LIMIT } from '@constants/state.js'
import { BaseMessage } from "@langchain/core/messages"
import { Annotation } from "@langchain/langgraph"
import { AvailableLanguages, IntentType, VisitorInfo } from '@moonie-types/state.js'

export const moonieState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, curr) => prev.concat(curr),
        default: () => []
    }),
    moonieHasAlreadyPresented: Annotation<boolean>({
        reducer: (_, curr) => curr,
        default: () => false
    }),
    visitorInfo: Annotation<VisitorInfo>({
        reducer: (prev, curr) => ({
            name: curr.name || prev.name,
            email: curr.email || prev.email,
            reason: curr.reason || prev.reason
        }),
        default: () => ({ name: null, email: null, reason: null })
    }),
    lastIntent: Annotation<IntentType>({
        reducer: (_, curr) => curr,
        default: () => null
    }),
    cvContent: Annotation<string>({
        reducer: (_, curr) => curr,
        default: () => ''
    }),
    cvLoaded: Annotation<boolean>({
        reducer: (_, curr) => curr,
        default: () => false
    }),
    messageLimit: Annotation<number>({
        reducer: (_, curr) => curr,
        default: () => MESSAGES_LIMIT
    }),
    language: Annotation<AvailableLanguages>({
        reducer: (_, curr) => curr,
        default: () => "en"
    }),
    downloadLanguageRequested: Annotation<AvailableLanguages>({
        reducer: (_, curr) => curr,
        default: () => "en"
    }),
})