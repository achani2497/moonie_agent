/**
 * Acciones que el front puede interpretar en un evento SSE `options`.
 */
export const OPTION_ACTIONS = {
    downloadCv: 'download-cv',
    scheduleMeeting: 'schedule-meeting',
    openCalendar: 'open-calendar',
} as const;

export type OptionAction = (typeof OPTION_ACTIONS)[keyof typeof OPTION_ACTIONS];
