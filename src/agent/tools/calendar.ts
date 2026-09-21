import { moonieState } from "@agent/state.js";
import { CHECK_CALENDAR_CAPABILITY } from "@constants/capabilities.js";
import { ENV } from "@constants/config.js";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { getCalendar } from "@services/google.js";
import { getDateRange, getFreeSlots } from "@utils/calendar.js";
import z from 'zod';
import { checkCalendarSchema } from "../../schemas/calendar.js";

type MoonieState = typeof moonieState.State;

export const checkCalendarTool = tool(
    async (
        { dateFrom, dateTo, timeFrom, timeTo }: z.infer<typeof checkCalendarSchema>,
        runtime: ToolRuntime<MoonieState>,
    ) => {
        // El ToolNode inyecta el state actual del grafo vía runtime.state
        const visitorName = runtime?.state?.visitorInfo?.name ?? null;

        console.log(`\n🔵 Consultando disponibilidad: ${dateFrom ?? '(ventana default)'} → ${dateTo ?? (dateFrom ?? '(5 días hábiles)')}, ventana horaria ${timeFrom ?? ENV.CALENDAR.HORARIO_DEFAULT_DESDE} - ${timeTo ?? ENV.CALENDAR.HORARIO_DEFAULT_HASTA}`);

        const calendar = getCalendar();

        // 1. Definir rango de consulta (desde inicio del primer día hasta fin del último)
        const { rangeStart, rangeEnd, windowStartTime, windowEndTime, days } = getDateRange(dateFrom, dateTo, timeFrom, timeTo)

        // 2. Consultar freeBusy API (una sola llamada para todo el rango)
        let response;
        try {
            response = await calendar.freebusy.query({
                requestBody: {
                    timeMin: rangeStart.toISOString(),
                    timeMax: rangeEnd.toISOString(),
                    items: [{ id: 'primary' }],
                    timeZone: ENV.CALENDAR.ZONA_HORARIA,
                },
            });
        } catch (error: any) {
            console.error(`   ❌ Error al consultar freebusy: ${error?.status ?? ''} ${error?.message ?? error}`);
            console.error(`   Detalle:`, JSON.stringify(error?.response?.data ?? error?.response ?? error, null, 2)?.slice(0, 1500));
            const fallbackMessage = 'Perdón, no pude consultar la agenda de Ale en este momento (problema temporal con Google Calendar). ¿Querés que lo intente de nuevo en unos minutos?';
            return visitorName ? `Perdón ${visitorName}, no pude consultar la agenda de Ale en este momento (problema temporal con Google Calendar). ¿Querés que lo intente de nuevo en unos minutos?` : fallbackMessage;
        }

        const busySlots = response.data.calendars?.['primary']?.busy ?? [];
        console.log(`   Bloques ocupados encontrados: ${busySlots.length}`);

        const freeSlots: string[] = getFreeSlots(busySlots, days, windowStartTime, windowEndTime);

        if (freeSlots.length === 0) {
            return visitorName
                ? `Perdón ${visitorName}, no encontré horarios libres en ese rango. ¿Querés que busque en otros días?`
                : `No encontré horarios libres en ese rango. ¿Querés que busque en otros días?`;
        }

        const greeting = visitorName ? `¡Genial, ${visitorName}!` : '¡Genial!';
        return `${greeting} Estos son los horarios libres que tiene Ale (horarios de Argentina):\n\n${freeSlots.join('\n\n')}\n\nDecime cuál te queda cómodo y con qué duración aproximada, así le agendo la llamada 🐶`;
    },
    {
        name: CHECK_CALENDAR_CAPABILITY.toolName,
        description: "Consulta disponibilidad en el calendario de Ale para una o varias fechas, con rango horario opcional. Devuelve los horarios libres agrupados por día. Si no se pasan fechas, calcula la ventana de los próximos 5 días hábiles desde mañana.",
        schema: checkCalendarSchema,
    }
)