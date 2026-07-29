import { ENV } from './config.js'

export const MESSAGES_LIMIT = Number(ENV.CONFIG.MESSAGES_LIMIT) || 15