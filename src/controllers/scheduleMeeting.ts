import { CustomError } from '@classes/customError.js';
import { ScheduleMeetingErrorMessage, SessionValidationErrorMessage } from '@constants/messages.js';
import { scheduleMeetingBySlot } from '@services/scheduling.js';
import { Request, Response } from 'express';
import { scheduleMeetingRequestSchema } from '@schemas/calendar.js';

export const handleScheduleMeeting = async (req: Request, res: Response) => {
    const parsed = scheduleMeetingRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: SessionValidationErrorMessage });
    }

    try {
        const { message, eventLink } = await scheduleMeetingBySlot(parsed.data.userId, parsed.data.value);
        return res.status(200).json({ message, eventLink });
    } catch (error) {
        console.error('[handleScheduleMeeting] Error:', error);
        // El service lanza CustomError con su código HTTP; cualquier otro error es 500 genérico.
        const code = error instanceof CustomError ? error.code : 500;
        const message = error instanceof CustomError ? error.message : ScheduleMeetingErrorMessage;
        return res.status(code).json({ message });
    }
};
