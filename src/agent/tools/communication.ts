import { TELEGRAM_CAPABILITY } from "@constants/capabilities.js";
import { tool } from "@langchain/core/tools";
import { sendMessage } from "@services/telegram.js";
import { TelegramMessage } from "../../schemas/telegram.js";

export const sendTelegramMessage = tool(async ({ message }) => {
    await sendMessage(message);
    return 'Ok' // Este mensaje no se levanta en ningun lado
}, {
    name: TELEGRAM_CAPABILITY.toolName,
    description: "This tool has to be called ONLY for sending a telegram message when it is required.",
    schema: TelegramMessage
});
