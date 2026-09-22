import { moonieState } from "@agent/state.js";
import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY } from "@constants/capabilities.js";
import { ENV } from "@constants/config.js";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { getCalendar } from "@services/google.js";
import { sendMessage } from "@services/telegram.js";
import { buildEventRequestBody, getDateRange, getFreeSlots } from "@utils/calendar.js";
import { addMinutesToHHMM, formatDate, toArgDate } from "@utils/dates.js";
import z from 'zod';
import { checkCalendarSchema, setMeetingSchema } from "../../schemas/calendar.js";

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

        console.log(`\n📅 Agendando reunión: ${date} ${timeFrom}${timeTo ? ` → ${timeTo}` : ` (+${ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN} min)`} con ${visitorName} <${visitorEmail}>`);

        const calendar = getCalendar();
        const requestBody = buildEventRequestBody({ visitorName, visitorEmail, reason, date, timeFrom, timeTo });

        let created;
        try {
            created = await calendar.events.insert({
                calendarId: ENV.CALENDAR.CALENDAR_ID,
                requestBody,
                sendUpdates: 'all',
                conferenceDataVersion: 1,
            });
        } catch (error: any) {
            console.error(`   ❌ Error al crear el evento: ${error?.status ?? ''} ${error?.message ?? error}`);
            console.error(`   Detalle:`, JSON.stringify(error?.response?.data ?? error?.response ?? error, null, 2)?.slice(0, 1500));
            throw new Error(visitorName
                ? `Perdón ${visitorName}, no pude agendar la reunión en el calendario de Ale en este momento (problema temporal con Google Calendar). ¿Querés que lo intente de nuevo?`
                : `Perdón, no pude agendar la reunión en el calendario de Ale en este momento (problema temporal con Google Calendar). ¿Querés que lo intente de nuevo?`);
        }

        const meetEntryPoint = created.data.conferenceData?.entryPoints?.find(
            (entryPoint) => entryPoint.entryPointType === 'video',
        );
        const meetLink = created.data.hangoutLink ?? meetEntryPoint?.uri ?? '';

        const endTime = timeTo ?? addMinutesToHHMM(timeFrom, ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN);
        const durationLabel = timeTo
            ? `${timeFrom} - ${endTime}`
            : `${timeFrom} - ${endTime} (${ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN} min)`;

        const notice = `📅 Nueva reunión agendada en tu calendario:\n👤 ${visitorName} <${visitorEmail}>\n🗓️ ${formatDate(toArgDate(date))} ${durationLabel} (horarios de Argentina)${meetLink ? `\n🔗 Meet: ${meetLink}` : ''}\n💬 Motivo: ${reason}`;
        void sendMessage(notice).catch((error) => console.error('[setMeeting] aviso a Ale falló (el evento sí se creó):', error));

        return `¡Listo ${visitorName}! Te agendé la videollamada con Ale para el ${formatDate(toArgDate(date))} de ${durationLabel} (horarios de Argentina) 🐶\n\nTe envié la invitación por mail con el link de Meet:\n${meetLink}\n\nCualquier cosa, me ladras!`;
    },
    {
        name: SET_MEETING_CAPABILITY.toolName,
        description: "Crea la videollamada (Google Meet) en el calendario de Ale para el visitante, con su nombre, email y motivo registrados. Le envía la invitación por mail al visitante. Usar SOLO cuando el usuario confirmó una fecha, hora exacta y (opcionalmente) duración de los horarios libres que ya se le mostraron.",
        schema: setMeetingSchema,
    }
)