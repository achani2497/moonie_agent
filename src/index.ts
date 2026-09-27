import { ENV } from '@constants/config.js';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import moonieRoutes from '@routes/personalData.js';


const app = express();
const PORT = ENV.CONFIG.PORT;
const URL_PREFIX = `/api/${ENV.CONFIG.VERSION}`

app.use(cors());
app.use(express.json());

app.use(`${URL_PREFIX}/`, moonieRoutes)

app.listen(PORT, () => {
  console.log(`Moonie is listening on http://localhost:${PORT}${URL_PREFIX}`);
});
