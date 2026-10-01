import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { ENV } from '@constants/config.js';
import fs from 'node:fs';
import path from 'node:path';

const createCheckpointer = (): SqliteSaver => {
    const dbPath = path.resolve(ENV.CONFIG.DB_PATH);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const checkpointer = SqliteSaver.fromConnString(dbPath);

    checkpointer.db.pragma('journal_mode = WAL'); // requisito de Litestream para poder replicar el archivo.
    checkpointer.db.pragma('busy_timeout = 5000'); // evita que la app falle mientras Litestream toma locks breves.
    checkpointer.db.pragma('synchronous = NORMAL'); // el balance recomendado trabajando con WAL.

    return checkpointer;
};

export const moonieCheckpointer = createCheckpointer();
