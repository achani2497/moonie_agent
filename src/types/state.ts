import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY, TELEGRAM_CAPABILITY } from '../constants/capabilities.js';

export type IntentType =
    | "cv-question"
    | "cv-download"
    | "other"
    | "unknown"
    | typeof CHECK_CALENDAR_CAPABILITY.intent
    | typeof SET_MEETING_CAPABILITY.intent
    | typeof TELEGRAM_CAPABILITY.intent
    | null

export type AvailableLanguages = "es" | "en"

export type VisitorInfo = {
    name: string | null,
    email: string | null,
    reason: string | null
}