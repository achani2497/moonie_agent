import type { ChatEventEmitter } from '@services/stream/chatStream.js';

// Copy aislado en un record: los mensajes de feedback que se muestran mientras
// Moonie trabaja en los nodos silenciosos. Simplificado a un record + helper —
// una clase con un solo método no aporta nada acá.
const NODE_STATUS_MESSAGES: Record<string, string> = {
  EXTRACT_visitorInfo: 'Tomando nota de quién sos...',
  classifyIntent: 'Entendiendo qué necesitás...',
};

export const emitNodeStatus = (chatEventEmitter: ChatEventEmitter | undefined, nodeName: string) => {
  const message = NODE_STATUS_MESSAGES[nodeName];
  if (message) chatEventEmitter?.emitStatus(message);
};
