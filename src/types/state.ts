import { TELEGRAM_CAPABILITY } from '../constants/capabilities.js';

export type IntentType = "cv-question" | "cv-download" | "other" | "unknown" | "set-meeting" | typeof TELEGRAM_CAPABILITY.intent | null

export type AvailableLanguages = "es" | "en"

export type VisitorInfo = {
    name: string | null,
    email: string | null,
    reason: string | null
}