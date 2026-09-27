import { handleNewMessage } from '@controllers/personalData.js';
import { handleScheduleMeeting } from '@controllers/scheduleMeeting.js';
import 'dotenv/config';
import { Request, Response, Router } from 'express';


const moonieRoutes: Router = Router()

moonieRoutes.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', name: 'moonie' });
});
moonieRoutes.post('/new-message', handleNewMessage)
moonieRoutes.post('/schedule-meeting', handleScheduleMeeting)

export default moonieRoutes