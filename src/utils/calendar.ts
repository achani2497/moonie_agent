import { ENV } from '@constants/config.js';
import { addDays, formatDate, formatTimeToHHMM, isWeekend, normalizeIso, toArgDate, todayInArgentina } from './dates.js';

/** Intervalo ocupado devuelto por freebusy: solo necesita inicio y fin en formato ISO (desacoplado de googleapis) */
export interface BusyInterval {
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

export function getFreeSlots(busySlots: BusyInterval[], days: string[], windowStartTime: string, windowEndTime: string) {
    const freeSlots: string[] = [];

    for (const dayStr of days) {
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

        // Encontrar gaps entre bloques ocupados
        const daySlots: string[] = [];
        let cursor = new Date(windowStart);

        for (const busyBlock of dayBusy) {
            if (busyBlock.start > cursor) {
                const gapMinutos = (busyBlock.start.getTime() - cursor.getTime()) / 60000;
                if (gapMinutos >= ENV.CALENDAR.SLOT_MINIMO_MINUTOS) {
                    daySlots.push(`${formatTimeToHHMM(cursor)} - ${formatTimeToHHMM(busyBlock.start)}`);
                }
            }
            if (busyBlock.end > cursor) {
                cursor = new Date(busyBlock.end);
            }
        }

        // Slot libre después del último evento ocupado
        if (windowEnd > cursor) {
            const gapMinutos = (windowEnd.getTime() - cursor.getTime()) / 60000;
            if (gapMinutos >= ENV.CALENDAR.SLOT_MINIMO_MINUTOS) {
                daySlots.push(`${formatTimeToHHMM(cursor)} - ${formatTimeToHHMM(windowEnd)}`);
            }
        }

        if (daySlots.length > 0) {
            freeSlots.push(`📅 ${formatDate(toArgDate(dayStr))}:\n  ${daySlots.join('\n  ')}`);
        }
    }

    return freeSlots
}