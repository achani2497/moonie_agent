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
    }
}