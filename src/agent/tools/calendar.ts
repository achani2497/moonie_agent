import { moonieState } from "@agent/state.js";
import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY } from "@constants/capabilities.js";
import { ENV } from "@constants/config.js";
import { OPTION_ACTIONS } from "@constants/chat.js";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { getCalendar } from "@services/google.js";
import { buildMeetingConfirmationMessage, createMeeting } from "@services/meeting.js";
import type { ChatEventEmitter } from "@services/stream/chatStream.js";
import { getDateRange, getDaySlotOptions, getFreeSlots } from "@utils/calendar.js";
import { formatDate, toArgDate } from "@utils/dates.js";
import z from 'zod';
import { checkCalendarSchema, setMeetingSchema } from "@schemas/calendar.js";

type MoonieState = typeof moonieState.State;

export const checkCalendarTool = tool(
    async (
        { dateFrom, dateTo, timeFrom, timeTo }: z.infer<typeof checkCalendarSchema>,
        runtime: ToolRuntime<MoonieState>,
    ) => {
        // El ToolNode inyecta el state actual del grafo vía runtime.state
        const visitorName = runtime?.state?.visitorInfo?.name ?? null;
        const chatEventEmitter = runtime?.configurable?.streamHandler as ChatEventEmitter | undefined;

        console.log(`\n🔵 Consultando disponibilidad: ${dateFrom ?? '(ventana default)'} → ${dateTo ?? (dateFrom ?? '(5 días hábiles)')}, ventana horaria ${timeFrom ?? ENV.CALENDAR.HORARIO_DEFAULT_DESDE} - ${timeTo ?? ENV.CALENDAR.HORARIO_DEFAULT_HASTA}`);

        const calendar = getCalendar();

        // 1. Definir rango de consulta (desde inicio del primer día hasta fin del último)
        const { rangeStart, rangeEnd, windowStartTime, windowEndTime, days } = getDateRange(dateFrom, dateTo, timeFrom, timeTo)

        // Día puntual = el usuario pidió horarios de UNA fecha particular
        const isSingleDay = Boolean(dateFrom) && days.length === 1;

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

        if (isSingleDay && chatEventEmitter) {
            const dayStr = days[0];
            const slotOptions = getDaySlotOptions(busySlots, dayStr, windowStartTime, windowEndTime);

            if (slotOptions.length === 0) {
                return visitorName
                    ? `Perdón ${visitorName}, no encontré horarios libres para ese día. ¿Querés que busque en otros días?`
                    : `No encontré horarios libres para ese día. ¿Querés que busque en otros días?`;
            }

            chatEventEmitter?.emitOptions(slotOptions.map(({ label, value }) => ({
                label,
                value,
                action: OPTION_ACTIONS.scheduleMeeting,
            })));

            const greeting = visitorName ? `¡Genial, ${visitorName}!` : '¡Genial!';
            return `${greeting} Estos son los horarios libres de Ale para el ${formatDate(toArgDate(dayStr))} (horarios de Argentina). Elegí el que te quede cómodo 👇`;
        }

        // --- Camino rango: listado en texto (comportamiento original) ---
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
        description: "Consulta disponibilidad en el calendario de Ale para una o varias fechas, con rango horario opcional. Para UNA fecha puntual devuelve los horarios libres como opciones de 30 min seleccionables; para un rango devuelve un listado de texto agrupado por día. Si no se pasan fechas, calcula la ventana de los próximos 5 días hábiles desde mañana.",
        schema: checkCalendarSchema,
    }
)

export const setMeetingTool = tool(
    async (
        { date, timeFrom, timeTo }: z.infer<typeof setMeetingSchema>,
        runtime: ToolRuntime<MoonieState>,
    ) => {
        // La tool arma el evento con los datos del state: el modelo solo decide fecha/hora/duración
        const visitorName = runtime?.state?.visitorInfo?.name ?? null;
        const visitorEmail = runtime?.state?.visitorInfo?.email ?? null;
        const reason = runtime?.state?.visitorInfo?.reason ?? null;

        if (!visitorName || !visitorEmail || !reason) {
            throw new Error('Me falta algún dato tuyo (nombre, email o motivo) para poder agendar la reunión. ¿Me lo repetís?');
        }

        const { eventLink, durationLabel } = await createMeeting({ visitorName, visitorEmail, reason, date, timeFrom, timeTo });

        return buildMeetingConfirmationMessage({ visitorName, date, durationLabel, eventLink });
    },
    {
        name: SET_MEETING_CAPABILITY.toolName,
        description: "Crea la videollamada (Google Meet) en el calendario de Ale para el visitante, con su nombre, email y motivo registrados. Le envía la invitación por mail al visitante. Usar SOLO cuando el usuario confirmó una fecha, hora exacta y (opcionalmente) duración de los horarios libres que ya se le mostraron.",
        schema: setMeetingSchema,
    }
)
