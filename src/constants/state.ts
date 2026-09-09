import { TELEGRAM_CAPABILITY } from '@constants/capabilities.js';
import { ENV } from './config.js';

export const MESSAGES_LIMIT = Number(ENV.CONFIG.MESSAGES_LIMIT) || 15

export const NEXT_NODE_BY_TOOL = {
    [TELEGRAM_CAPABILITY.toolName]: "confirmationActionResult"
}