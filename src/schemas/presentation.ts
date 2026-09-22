import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY, TELEGRAM_CAPABILITY } from '@constants/capabilities.js'
import { z } from 'zod'

export const presentationSchema = z.object({
    name: z.string().nullable().describe('Es el nombre completo o apodo de la persona visitante que está haciendo una consulta'),
    email: z.string().nullable().describe('Es el email/correo electrónico de la persona visitante que está haciendo una consulta'),
    reason: z.string().nullable().describe('Motivo por el cual el visitante inició el chat'),
    language: z.enum(["en", "es"]).describe('El lenguaje utilizado por el visitante. Si no es inglés o español, el default tiene que ser "en"')
})

export const intentSchema = z.object({
    intent: z.enum(["cv-question", "cv-download", "other", TELEGRAM_CAPABILITY.intent, CHECK_CALENDAR_CAPABILITY.intent, SET_MEETING_CAPABILITY.intent, "unknown"])
        .describe('Clasificación de la intención del último mensaje del usuario')
})