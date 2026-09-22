import dotenv from "dotenv"

dotenv.config()

export const ENV = {
    CONFIG: {
        VERSION: process.env.MOONIE_VERSION || "v1",
        PORT: process.env.PORT || "3000",
        LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
        LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
        LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL,
        MESSAGES_LIMIT: process.env.MESSAGES_LIMIT
    },
    TELEGRAM: {
        BOT_TOKEN: process.env.BOT_TOKEN,
        CHAT_ID: process.env.CHAT_ID
    },
    CALENDAR: {
        CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
        HORARIO_DEFAULT_DESDE: '09:00',
        HORARIO_DEFAULT_HASTA: '17:00',
        DIAS_HABILES_VENTANA: 5,
        SLOT_MINIMO_MINUTOS: 30,
        DURACION_REUNION_DEFAULT_MIN: 30,
        NOMBRE_ANFITRION: 'Alejandro Chañi',
        ZONA_HORARIA: 'America/Argentina/Buenos_Aires'
    },
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN
    }
}