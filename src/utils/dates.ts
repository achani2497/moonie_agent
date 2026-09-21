import { ENV } from '@constants/config.js';

/** Fecha de HOY en Argentina como yyyy-mm-dd (independiente de la TZ del server) */
export function todayInArgentina(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ENV.CALENDAR.ZONA_HORARIA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/** Suma n días a una fecha ISO yyyy-mm-dd usando aritmética pura en UTC (sin TZ local del server) */
export function addDays(isoDate: string, days: number): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
}

/** Devuelve true si la fecha ISO cae sábado o domingo */
export function isWeekend(isoDate: string): boolean {
    const [year, month, day] = isoDate.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

/** Normaliza fechas con formato suelto (ej '2026-7-3') a yyyy-mm-dd */
export function normalizeIso(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return isoDate;
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(parsedDate.getTime())) return isoDate;
    return parsedDate.toISOString().split('T')[0];
}

/** Crea un Date en hora argentina a partir de fecha ISO + hora opcional */
export function toArgDate(isoDate: string, time?: string): Date {
    if (time) {
        return new Date(`${isoDate}T${time}:00-03:00`);
    }
    return new Date(`${isoDate}T00:00:00-03:00`);
}

/** Formatea un Date a hora HH:mm en Argentina */
export function formatTimeToHHMM(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
        timeZone: ENV.CALENDAR.ZONA_HORARIA,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
}

/** Formatea un Date a día y mes en Argentina */
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
        timeZone: ENV.CALENDAR.ZONA_HORARIA,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(date);
}