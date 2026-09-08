import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { ChatEventEmitter } from "@services/stream/chatStream.js";

export const toolWasCalled = (response: any) => {
    return Array.isArray(response.tool_calls) && response.tool_calls.length > 0;
}

export const toolCallFailed = (message: ToolMessage) => {
    return message.status === "error" || (message.content as string).startsWith('Error')
}

export const handleFailedToolCall = (nodeName: string, message: string, chatEventEmitter: ChatEventEmitter | undefined, response: any) => {
    console.error(`[${nodeName}] sin tool_call. finishReason:`, response.response_metadata?.finishReason);
    chatEventEmitter?.streamMessageChunk(message);
    return new AIMessage({ content: message })
}