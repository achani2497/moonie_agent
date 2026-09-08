import { INTENT_TO_NODE } from "@constants/models.js"
import { NEXT_NODE_BY_TOOL } from "@constants/state.js"
import { END } from "@langchain/langgraph"
import { getLastMessage } from "@utils/state.js"
import { toolWasCalled } from "@utils/tools.js"
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

export const CHECK_toolCallWasBinded = (toolNodeName: string) => (state: typeof moonieState.State) => {
    const lastMessage = getLastMessage(state)
    const aToolWasCalled = toolWasCalled(lastMessage)

    return aToolWasCalled ? toolNodeName : END
}

export const CHECK_afterToolCall = (state: typeof moonieState.State) => {
    const lastMessage = getLastMessage(state);
    const toolName = (lastMessage as any)?.name;

    if (toolName && toolName in NEXT_NODE_BY_TOOL) {
        return NEXT_NODE_BY_TOOL[toolName as keyof typeof NEXT_NODE_BY_TOOL];
    }

    return END;
}