import { moonieState } from "@agent/state.js"
import { MESSAGE_TYPE_TAG } from "@constants/models.js"
import { MessageType } from "@moonie-types/models.js"

export const getLastMessageFromType = (type: MessageType, state: typeof moonieState.State) => {
    const reversedMessages = state.messages.slice().reverse()
    const lastMessageFromType = reversedMessages.find(message => message.type === type)

    return lastMessageFromType?.content
}

export const getMessagesFromType = (type: MessageType, state: typeof moonieState.State) => {
    return state.messages.filter(message => message.type === type)
}

export const getTaggedMessagesFromType = (type: MessageType, state: typeof moonieState.State) => {
    const messages = getMessagesFromType(type, state)
    const TAG = MESSAGE_TYPE_TAG[type]

    const parsedMessages = messages.map(message => {
        return `<${TAG}>${message.content}</${TAG}>`
    })

    return parsedMessages
}

export const getLastMessage = (state: typeof moonieState.State) => {
    return state.messages.pop()
}

export const lastMessageWasToolCall = (state: typeof moonieState.State) => {
    const lastMessage = getLastMessage(state)
    return lastMessage?.type === 'tool'
}