import z from "zod";

export const TelegramMessage = z.object({
    message: z.string().describe('Content of the message that will be sent via Telegram')
})