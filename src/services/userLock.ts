/**
 * Lock en vuelo por usuario: evita procesar dos requests concurrentes del mismo user
 * (ej: dos mensajes de chat, o un click de botón mientras corre un turno de chat).
 * Per-process / in-memory: válido para el deploy de instancia única actual (igual que MemorySaver).
 */
const lockedUsers = new Set<string>();

export const isUserLocked = (userId: string): boolean => lockedUsers.has(userId);

export const lockUser = (userId: string): void => {
    lockedUsers.add(userId);
};

export const unlockUser = (userId: string): void => {
    lockedUsers.delete(userId);
};
