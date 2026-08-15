import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';


export const readFile = (fileName: string) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = path.join(__dirname, `../data/${fileName}`);
    const fileData = fs.readFileSync(filePath, 'utf-8');

    return fileData
}