import { INTENT_TO_NODE } from "@constants/models.js"
import { moonieState } from "./state.js"

export const CHECK_messageLimit = (state: typeof moonieState.State) => {
    if (state.messageLimit <= 0) {
        return "sendMessageLimitExceeded"
    }

    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason

    return hasAllParams ? "classifyIntent" : "EXTRACT_visitorInfo"
}

export const CHECK_visitorDataIsComplete = (state: typeof moonieState.State) => {
    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason
    return hasAllParams ? "classifyIntent" : "presentationAndLanguageDetection"
}

export const CHECK_visitorIntention = (state: typeof moonieState.State) => {
    const intention = state.lastIntent

    return intention ? INTENT_TO_NODE[intention] : "handleUnknown";
}