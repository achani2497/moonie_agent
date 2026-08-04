import { moonieState } from "@agent/state.js"

export const getLastHumanMessage = (state: typeof moonieState.State) => {
    const reversedMessages = state.messages.slice().reverse()
    const lastHumanMessage = reversedMessages.find(message => message.type === "human")

    return lastHumanMessage?.content
}

export const getHumanMessages = (state: typeof moonieState.State) => {
    return state.messages.filter(message => message.type === "human")
}

export const getTaggedHumanMessages = (state: typeof moonieState.State) => {
    const humanMessages = getHumanMessages(state)
    const parsedHumanMessages = humanMessages.map(message => {
        return `<USER_MESSAGE>${message.content}</USER_MESSAGE>`
    })

    return parsedHumanMessages
}