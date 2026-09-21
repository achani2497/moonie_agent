import z from 'zod';

export const checkCalendarSchema = z.object({
    dateFrom: z.string().optional().describe(
        "Fecha de inicio (opcional). Formato ISO: 'yyyy-mm-dd' (ej: '2026-07-13'). " +
        "Usarla cuando el usuario da una fecha puntual o el inicio de un rango. " +
        "Si el usuario pidió ver disponibilidad sin dar ninguna fecha, NO la envíes: la tool calcula la ventana (próximos 5 días hábiles desde mañana)."
    ),
    dateTo: z.string().optional().describe(
        "Fecha de fin (opcional). Solo usarla cuando el usuario da un RANGO de días " +
        "o un punto de partida (ej: 'a partir del martes' → dateTo = 5 días hábiles después). " +
        "Formato ISO: 'yyyy-mm-dd'."
    ),
    timeFrom: z.string().optional().describe(
        "Hora de inicio del rango horario (opcional). " +
        "Usarla cuando el usuario menciona un horario de inicio. " +
        "Ej: 'desde las 15hs' → '15:00'. Formato: 'HH:mm'."
    ),
    timeTo: z.string().optional().describe(
        "Hora de fin del rango horario (opcional). Requiere timeFrom. " +
        "Usarla cuando el usuario menciona un horario de corte. " +
        "Ej: 'hasta las 18hs' → '18:00'. Formato: 'HH:mm'."
    )
}).superRefine((data, ctx) => {
    if (data.timeTo && !data.timeFrom) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "timeTo requiere timeFrom: si el usuario solo da hora de corte, no envíes timeTo.",
            path: ["timeTo"],
        });
    }

    if (data.timeFrom && data.timeTo) {
        const start = parseHHMM(data.timeFrom);
        const end = parseHHMM(data.timeTo);
        if (start !== null && end !== null && start >= end) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "timeFrom debe ser menor a timeTo (ventana horaria invertida).",
                path: ["timeFrom"],
            });
        }
    }
});

function parseHHMM(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}