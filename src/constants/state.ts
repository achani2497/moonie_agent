import { ENV } from './config.js'
import { SEND_TELEGRAM_MESSAGE } from './toolNames.js'

export const MESSAGES_LIMIT = Number(ENV.CONFIG.MESSAGES_LIMIT) || 15

export const NEXT_NODE_BY_TOOL = {
    [SEND_TELEGRAM_MESSAGE]: "confirmationActionResult"
}