import { ENV } from '@constants/config.js';
import { getCalendar } from '@services/google.js';
import { sendMessage } from '@services/telegram.js';
import { buildEventRequestBody } from '@utils/calendar.js';
import { addMinutesToHHMM, formatDate, toArgDate } from '@utils/dates.js';

interface CreateMeetingParams {
    visitorName: string;
    visitorEmail: string;
    reason: string;
    date: string;
    timeFrom: string;
    timeTo?: string;
}

interface CreatedMeeting {
    meetLink: string;
    eventLink: string;
    durationLabel: string;
}

export async function createMeeting({ visitorName, visitorEmail, reason, date, timeFrom, timeTo }: CreateMeetingParams): Promise<CreatedMeeting> {
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
    // Link al evento en la Google Calendar Web UI (no a la llamada de Meet).
    const eventLink = created.data.htmlLink ?? '';

    const endTime = timeTo ?? addMinutesToHHMM(timeFrom, ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN);
    const durationLabel = timeTo
        ? `${timeFrom} - ${endTime}`
        : `${timeFrom} - ${endTime} (${ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN} min)`;

    const notice = `📅 Nueva reunión agendada en tu calendario:\n👤 ${visitorName} <${visitorEmail}>\n🗓️ ${formatDate(toArgDate(date))} ${durationLabel} (horarios de Argentina)${meetLink ? `\n🔗 Meet: ${meetLink}` : ''}\n💬 Motivo: ${reason}`;
    void sendMessage(notice).catch((error) => console.error('[createMeeting] aviso a Ale falló (el evento sí se creó):', error));

    return { meetLink, eventLink, durationLabel };
}

export function buildMeetingConfirmationMessage({ visitorName, date, durationLabel, eventLink }: {
    visitorName: string;
    date: string;
    durationLabel: string;
    eventLink: string;
}): string {
    const eventLine = eventLink
        ? `Podés ver el evento en tu Google Calendar acá: [Link a la reunión](${eventLink})`
        : 'Te llegó la invitación por mail con el link de Meet.';

    return `¡Listo ${visitorName}! Te agendé la videollamada con Ale para el ${formatDate(toArgDate(date))} de ${durationLabel} (horarios de Argentina) 🐶\n\nYa tenés la invitación a la reu en tu mail. ${eventLine}\n\nEn caso de querer comunicarte con Ale antes de la reunión, le podés enviar un mail a alejandro.chani24@gmail.com!`;
}
