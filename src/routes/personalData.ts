import { handleNewMessage } from '@controllers/personalData.js';
import 'dotenv/config';
import { Request, Response, Router } from 'express';


const moonieRoutes: Router = Router()

moonieRoutes.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', name: 'moonie' });
});
moonieRoutes.post('/new-message', handleNewMessage)

export default moonieRoutes