import { TELEGRAM_CAPABILITY } from '@constants/capabilities.js';
import type { ChatEventEmitter } from '@services/stream/chatStream.js';

// Copy aislado en un record: los mensajes de feedback que se muestran mientras
// Moonie trabaja en los nodos silenciosos. Simplificado a un record + helper —
// una clase con un solo método no aporta nada acá.
const NODE_STATUS_MESSAGES: Record<string, string> = {
  EXTRACT_visitorInfo: 'Identificando quién sos con mi olfato',
  classifyIntent: 'Agudizando las orejas para entender qué necesitás',
  [TELEGRAM_CAPABILITY.handlerNode]: TELEGRAM_CAPABILITY.statusMessage
};

export const emitNodeStatus = (chatEventEmitter: ChatEventEmitter | undefined, nodeName: string) => {
  const message = NODE_STATUS_MESSAGES[nodeName];
  if (!message) return
  chatEventEmitter?.emitStatus(message);
  chatEventEmitter?.armSlowTimer()
};
