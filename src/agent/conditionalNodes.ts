import { moonieState } from "./state.js"

export const messageLimitCheck = (state: typeof moonieState.State) => {
    if (state.messageLimit <= 0) {
        return "sendMessageLimitExceeded"
    }

    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason

    return hasAllParams ? "classifyIntent" : "EXTRACT_visitorInfo"
}

export const visitorDataIsCompleteCheck = (state: typeof moonieState.State) => {
    const { name, email, reason } = state.visitorInfo
    const hasAllParams = name && email && reason
    return hasAllParams ? "classifyIntent" : "presentationAndLanguageDetection"
}

export const visitorIntentionCheck = (state: typeof moonieState.State) => {
    const intention = state.lastIntent

    switch (intention) {
        case "cv-question":
            return "loadContext"
        // case "cv-download":
        //     return ""
        case "other":
            return "handleOther"
        case "unknown":
            return "handleUnknown"
        default: return "handleUnknown"
    }
}