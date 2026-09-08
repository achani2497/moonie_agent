import { SEND_TELEGRAM_MESSAGE } from "@constants/toolNames.js";
import { tool } from "@langchain/core/tools";
import { sendMessage } from "@services/telegram.js";
import z from "zod";
import { TelegramMessage } from "../../schemas/telegram.js";

export const sendTelegramMessage = tool(async ({ message }: z.infer<typeof TelegramMessage>) => {
    await sendMessage(message)
    console.log('Mensaje enviado exitosamente');
    return 'Ok' // Este mensaje no se levanta en ningun lado
}, {
    name: SEND_TELEGRAM_MESSAGE,
    description: "This tool has to be called ONLY for sending a telegram message when it is required.",
    schema: TelegramMessage
})