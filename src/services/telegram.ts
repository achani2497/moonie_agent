import { ENV } from "@constants/config.js";
import axios from 'axios';
import https from 'https';

export const sendMessage = async (message: string): Promise<void> => {
    const attempts = 3
    for (let i = 0; i < attempts; i++) {
        try {
            await axios.post(`https://api.telegram.org/bot${ENV.TELEGRAM.BOT_TOKEN}/sendMessage`,
                {
                    chat_id: ENV.TELEGRAM.CHAT_ID,
                    text: message
                },
                {
                    timeout: 30000,
                    httpAgent: new https.Agent({ family: 4 }),
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                }
            )
            return;
        } catch (e) {
            const intentoActual = i + 1
            console.log(`Error enviando el mensaje. Intento ${intentoActual} de ${attempts}.`, (e as Error).message)

            if (intentoActual < attempts) {
                const espera = 30000 * intentoActual
                console.log(`Renintentando en ${espera / 1000} segundos`)
                await new Promise((resolve) => setTimeout(resolve, espera))
            }
        }

    }
    throw new Error(`Error enviando el mensaje de telegram. Se alcanzó el maximo de reintentos: ${attempts}`)
}