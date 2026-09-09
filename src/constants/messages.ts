import { TELEGRAM_CAPABILITY } from '@constants/capabilities.js';

export const SLOW_STATUS_MESSAGES = [
    'Estoy persiguiendo mi propia cola para pensar la respuesta',
    'Masticando bien la idea',
    'Esto me está llevando más que atrapar la pelota, un segundo',
];

export const NoAvailableModelMessage = 'Woof... no estoy pudiendo hacer el truco que me pediste por problemas con mis adiestradores :(. Volvé a intentar en un ratito!'

export const GenericErrorMessage = 'Ups, algo se rompió pero yo no fui. Volvé a intentar en un momento!'

export const UnknownRequestMessage = 'Uyy, no me sé ese truco y no te puedo ayudar con eso. Pero como te dije, me encanta contarte sobre la vida profesional de Ale!'

export const LimitReachedMessage = 'Ay no! Ya llegaste al límite de mensajes del día, me toca dormir la siesta. Te espero mañanaaa!'

export const TOOL_CALL_RESPONSE_MESSAGES: Record<string, string> = {
    'default': "🐶 Me salió el truco!",
    [TELEGRAM_CAPABILITY.toolName]: TELEGRAM_CAPABILITY.successMessage,
}