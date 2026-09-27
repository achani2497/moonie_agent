import { ENV } from '@constants/config.js';
import type { CalendarEventBody } from '@moonie-types/calendar.js';
import { addDays, addMinutesToHHMM, formatDate, formatTimeToHHMM, isWeekend, normalizeIso, toArgDate, todayInArgentina } from './dates.js';

/** Intervalo ocupado devuelto por freebusy: solo necesita inicio y fin en formato ISO (desacoplado de googleapis) */
interface BusyInterval {
    start?: string | null;
    end?: string | null;
}

/**
 * Ventana por default: los próximos DIAS_HABILES_VENTANA días hábiles empezando mañana.
 */
export function getDefaultWindowDates(): { start: string; end: string } {
    const days: string[] = [];
    let cursor = addDays(todayInArgentina(), 1); // mañana: nunca el mismo día que la consulta
    while (days.length < ENV.CALENDAR.DIAS_HABILES_VENTANA) {
        if (!isWeekend(cursor)) days.push(cursor);
        cursor = addDays(cursor, 1);
    }
    return { start: days[0], end: days[days.length - 1] };
}

export function getDateRange(dateFrom?: string, dateTo?: string, timeFrom?: string, timeTo?: string) {
    // 1. Resolver la ventana de fechas (toda la lógica es determinística, no depende del LLM)
    let startIso: string;
    let endIso: string;
    let isAutoWindow = false;

    if (!dateFrom) {
        // Sin fechas → ventana default (próximos 5 días hábiles desde mañana)
        const defaultWindow = getDefaultWindowDates();
        startIso = defaultWindow.start;
        endIso = defaultWindow.end;
        isAutoWindow = true;
    } else {
        startIso = normalizeIso(dateFrom);
        // dateFrom solo = un día puntual (el usuario preguntó por un día específico)
        endIso = dateTo ? normalizeIso(dateTo) : startIso;
    }

    const rangeStart = toArgDate(startIso);
    const rangeEnd = new Date(`${endIso}T23:59:59-03:00`);

    const windowStartTime = timeFrom ?? ENV.CALENDAR.HORARIO_DEFAULT_DESDE;
    const windowEndTime = timeTo ?? ENV.CALENDAR.HORARIO_DEFAULT_HASTA;

    // 2. Lista de días ISO a evaluar (findes solo se saltan en la ventana automática)
    const days: string[] = [];
    let cursor = startIso;
    while (cursor <= endIso) {
        if (!isAutoWindow || !isWeekend(cursor)) days.push(cursor);
        cursor = addDays(cursor, 1);
    }

    console.log(`   Rango total: ${rangeStart.toISOString()} → ${rangeEnd.toISOString()} (${days.length} días a evaluar)`);

    return { rangeStart, rangeEnd, windowStartTime, windowEndTime, days }
}

interface DayGap {
    start: Date;
    end: Date;
}

interface SlotOption {
    label: string;    // "09:00 - 09:30"
    value: string;    // "2026-09-29T09:00" (ISO local Argentina)
}

export function getDayGaps(busySlots: BusyInterval[], dayStr: string, windowStartTime: string, windowEndTime: string): DayGap[] {
    const windowStart = toArgDate(dayStr, windowStartTime);
    const windowEnd = toArgDate(dayStr, windowEndTime);

    // Busy slots que intersectan con la ventana del día actual
    const dayBusy = busySlots
        .filter((busyInterval) => {
            const busyStart = new Date(busyInterval.start!);
            const busyEnd = new Date(busyInterval.end!);
            return busyStart < windowEnd && busyEnd > windowStart;
        })
        .map((busyInterval) => ({
            start: new Date(busyInterval.start!),
            end: new Date(busyInterval.end!),
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps: DayGap[] = [];
    let cursor = new Date(windowStart);

    for (const busyBlock of dayBusy) {
        if (busyBlock.start > cursor) {
            gaps.push({ start: new Date(cursor), end: new Date(busyBlock.start) });
        }
        if (busyBlock.end > cursor) {
            cursor = new Date(busyBlock.end);
        }
    }

    // Gap libre después del último evento ocupado
    if (windowEnd > cursor) {
        gaps.push({ start: new Date(cursor), end: new Date(windowEnd) });
    }

    return gaps;
}

export function getFreeSlots(busySlots: BusyInterval[], days: string[], windowStartTime: string, windowEndTime: string) {
    const freeSlots: string[] = [];

    for (const dayStr of days) {
        const daySlots = getDayGaps(busySlots, dayStr, windowStartTime, windowEndTime)
            .filter((gap) => (gap.end.getTime() - gap.start.getTime()) / 60000 >= ENV.CALENDAR.SLOT_MINIMO_MINUTOS)
            .map((gap) => `${formatTimeToHHMM(gap.start)} - ${formatTimeToHHMM(gap.end)}`);

        if (daySlots.length > 0) {
            freeSlots.push(`📅 ${formatDate(toArgDate(dayStr))}:\n  ${daySlots.join('\n  ')}`);
        }
    }

    return freeSlots
}

/**
 * Discretiza los gaps libres de UN día en bloques seleccionables de `slotMinutes`.
 * Cada bloque arranca en el inicio del gap y avanza de a `slotMinutes`, descartando
 * los que no entren completos. Ej: gap 09:00-11:00, 30 → 09:00, 09:30, 10:00, 10:30.
 */
export function getDaySlotOptions(
    busySlots: BusyInterval[],
    dayStr: string,
    windowStartTime: string,
    windowEndTime: string,
    slotMinutes: number = ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN,
): SlotOption[] {
    const options: SlotOption[] = [];
    const slotMs = slotMinutes * 60000;

    for (const gap of getDayGaps(busySlots, dayStr, windowStartTime, windowEndTime)) {
        let cursor = gap.start.getTime();
        const gapEnd = gap.end.getTime();

        while (cursor + slotMs <= gapEnd) {
            const timeFrom = formatTimeToHHMM(new Date(cursor));
            const timeTo = formatTimeToHHMM(new Date(cursor + slotMs));
            options.push({
                label: `${timeFrom} - ${timeTo}`,
                value: `${dayStr}T${timeFrom}`,
            });
            cursor += slotMs;
        }
    }

    return options;
}

export function buildEventRequestBody({ visitorName, visitorEmail, reason, date, timeFrom, timeTo }: {
    visitorName: string;
    visitorEmail: string;
    reason: string;
    date: string;
    timeFrom: string;
    timeTo?: string;
}): CalendarEventBody {
    const endTime = timeTo ?? addMinutesToHHMM(timeFrom, ENV.CALENDAR.DURACION_REUNION_DEFAULT_MIN);

    return {
        summary: `${visitorName} - ${ENV.CALENDAR.NOMBRE_ANFITRION}`,
        description: `[Moonie] | ${reason}`,
        start: { dateTime: `${date}T${timeFrom}:00`, timeZone: ENV.CALENDAR.ZONA_HORARIA },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: ENV.CALENDAR.ZONA_HORARIA },
        attendees: [{ email: visitorEmail }],
        conferenceData: {
            createRequest: {
                requestId: `moonie-${date}-${timeFrom}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };
}