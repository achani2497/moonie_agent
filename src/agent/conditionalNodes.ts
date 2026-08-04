import { moonieState } from "./state.js"

export const messageLimitCheck = (state: typeof moonieState.State) => {
    if (state.messageLimit <= 0) {
        return "sendMessageLimitExceeded"
    }

    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason

    return hasAllParams ? "classifyIntent" : "presentationAndLanguageDetection"
}

export const visitorDataIsCompleteCheck = (state: typeof moonieState.State) => {
    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason
    return hasAllParams ? "classifyIntent" : "subtractOneMessageLimit"
}