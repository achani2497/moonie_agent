export type IntentType = "cv-question" | "cv-download" | "other" | "unknown" | "set-meeting" | "send-telegram-message" | null

export type AvailableLanguages = "es" | "en"

export type VisitorInfo = {
    name: string | null,
    email: string | null,
    reason: string | null
}