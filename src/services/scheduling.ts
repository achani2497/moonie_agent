import MoonieGraph from '@agent/graph.js';
import { moonieState } from '@agent/state.js';
import { CustomError } from '@classes/customError.js';
import { CHECK_CALENDAR_CAPABILITY, SET_MEETING_CAPABILITY } from '@constants/capabilities.js';
import {
    MeetingAlreadyScheduledMessage,
    ScheduleMeetingBusyMessage,
    ScheduleMeetingErrorMessage,
    SessionValidationErrorMessage,
} from '@constants/messages.js';
import { buildMeetingConfirmationMessage, createMeeting } from '@services/meeting.js';
import { isUserLocked, lockUser, unlockUser } from '@services/userLock.js';

interface ScheduledMeeting {
    message: string;
    eventLink: string;
}

/**
 * Caso de uso del click de un horario: crea la reunión de forma determinística (sin LLM).
 * Todos los rechazos/fallos se lanzan como CustomError (con su código HTTP); el controller
 * solo traduce ese código a una respuesta HTTP.
 */
export async function scheduleMeetingBySlot(userId: string, value: string): Promise<ScheduledMeeting> {
    if (isUserLocked(userId)) throw new CustomError(ScheduleMeetingBusyMessage, 409);
    lockUser(userId);

    try {
        const config = { configurable: { thread_id: userId } };
        const snapshot = await MoonieGraph.getState(config);
        const values = (snapshot?.values ?? {}) as typeof moonieState.State;
        const visitorInfo = values.visitorInfo;

        // Seguridad: sin los datos completos del visitante en el hilo, no agendamos nada.
        if (!visitorInfo?.name || !visitorInfo?.email || !visitorInfo?.reason) {
            throw new CustomError(SessionValidationErrorMessage, 400);
        }

        // Idempotencia: si ya hay una reunión creada para este hilo, no duplicamos.
        if (values.meetingCreated) throw new CustomError(MeetingAlreadyScheduledMessage, 409);

        // Gate: el click solo vale si el último turno fue pedir agenda (se acaban de ofrecer horarios).
        if (values.lastIntent !== CHECK_CALENDAR_CAPABILITY.intent) {
            throw new CustomError(SessionValidationErrorMessage, 400);
        }

        const [date, timeFrom] = value.split('T');

        let created;
        try {
            created = await createMeeting({
                visitorName: visitorInfo.name,
                visitorEmail: visitorInfo.email,
                reason: visitorInfo.reason,
                date,
                timeFrom,
            });
        } catch (error) {
            console.error('[scheduleMeetingBySlot] createMeeting falló:', error);
            // El mensaje de createMeeting es user-facing; cualquier otro error cae al genérico.
            throw new CustomError(
                error instanceof Error && error.message ? error.message : ScheduleMeetingErrorMessage,
                500,
            );
        }

        // Best-effort: marcar en el grafo para que el chat también lo sepa. Si falla, la reunión YA está creada.
        try {
            await MoonieGraph.updateState(config, { meetingCreated: true }, SET_MEETING_CAPABILITY.handlerNode);
        } catch (error) {
            console.error('[scheduleMeetingBySlot] no se pudo marcar meetingCreated (la reunión sí se creó):', error);
        }

        return {
            message: buildMeetingConfirmationMessage({
                visitorName: visitorInfo.name,
                date,
                durationLabel: created.durationLabel,
                eventLink: created.eventLink,
            }),
            eventLink: created.eventLink,
        };
    } finally {
        unlockUser(userId);
    }
}
