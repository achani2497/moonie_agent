import { TELEGRAM_CAPABILITY } from '@constants/capabilities.js';

export const SLOW_STATUS_MESSAGES = [
    'Estoy persiguiendo mi propia cola para pensar la respuesta',
    'Masticando bien la idea',
    'Esto me está llevando más tiempo que atrapar mi cola, un segundo',
];

export const NoAvailableModelMessage = 'Woof... no estoy pudiendo hacer el truco que me pediste por problemas con mis adiestradores :(. Volvé a intentar en un ratito!'

export const GenericErrorMessage = 'Ups, algo se rompió pero yo no fui. Volvé a intentar en un momento!'

export const UnknownRequestMessage = 'Uyy, no me sé ese truco y no te puedo ayudar con eso. Pero como te dije, me encanta contarte sobre la vida profesional de Ale!'

export const EmptyResponseMessage = 'Uy, se me escapó la pelota un segundo y no llegué a procesar tu mensaje. ¿Me lo repetís?'

export const LimitReachedMessage = 'Ay no! Ya llegaste al límite de mensajes del día, me toca dormir la siesta. Te espero mañanaaa!'

// Mensajes del endpoint determinístico de agenda (POST /schedule-meeting).
export const SessionValidationErrorMessage = 'No pude validar tu sesión. Probá de nuevo desde el chat.';
export const ScheduleMeetingErrorMessage = 'No pude agendar la reunión. ¿Lo intentamos de nuevo?';
export const ScheduleMeetingBusyMessage = 'Ya estoy agendando esa reunión, dame un segundo 🐶';
export const MeetingAlreadyScheduledMessage = 'Ya tenés una reunión agendada con Ale. Si querés cambiarla, contactalo por mail 🐶';

export const TOOL_CALL_RESPONSE_MESSAGES: Record<string, string> = {
    'default': "🐶 Me salió el truco!",
    [TELEGRAM_CAPABILITY.toolName]: TELEGRAM_CAPABILITY.successMessage,
}