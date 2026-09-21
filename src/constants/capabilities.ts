type Capability = {
  intent: string // Categoría de la intención del usuario
  intentDescription: string // Descripción de la categoría de la intención del usuario
  userFacingAction: string // Acción que va a poder pedir el visitante que Moonie realice
  handlerNode: string // Nombre del nodo encargado de hacer la tool call
  toolName: string // Nombre identificatorio de la tool dentro del código
  statusMessage: string // Mensaje que se le muestra al usuario a modo de feedback mientras el agente está haciendo la tarea
  successMessage: string // Mensaje que se le envía al usuario en el chat a modo de respuesta una vez que el agente terminó la tarea solicitada
  returnsUserFacingContent: boolean // true = el resultado de la tool se muestra directamente al usuario; false = se usa successMessage
}

export const TELEGRAM_CAPABILITY: Capability = {
  intent: 'send-telegram-message',
  intentDescription: 'el usuario/visitante quiere que le envíes un mensaje por Telegram a Ale con la información que ya te proveyó, su "name", "email" y "reason"',
  userFacingAction: 'Enviar mensaje via Telegram',
  handlerNode: 'handleTelegramMessage',
  toolName: 'sendTelegramMessage',
  statusMessage: 'Llevandole tu mensaje a Ale',
  successMessage: 'Ya le entregué el mensaje a Ale!🐶 Ni bien él lo vea se va a estar contactando con vos :)',
  returnsUserFacingContent: false,
} as const;

export const CHECK_CALENDAR_CAPABILITY: Capability = {
  intent: 'check-calendar',
  intentDescription: 'El usuario/visitante quiere que le des los slots libres que tenga Ale en su agenda segun su Google Calendar',
  userFacingAction: 'Chequear slot disponible en el Calendar de Ale',
  handlerNode: 'handleCalendarCheck',
  toolName: 'checkCalendarFreeSlots',
  statusMessage: 'Olfateando los lugares libres',
  successMessage: '',
  returnsUserFacingContent: true,
}

export const CAPABILITIES = {
  [TELEGRAM_CAPABILITY.toolName]: TELEGRAM_CAPABILITY,
  [CHECK_CALENDAR_CAPABILITY.toolName]: CHECK_CALENDAR_CAPABILITY,
} as const;