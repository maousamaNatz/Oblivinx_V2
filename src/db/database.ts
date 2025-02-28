import path from 'path';
import fs from 'fs';
import config from '../config/config';

// Buat folder sessions jika belum ada
const sessionsDir = path.join(process.cwd(), config.session.path);
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

// Tambahkan pembuatan direktori untuk file JSON
const jsonDbDirs = [
    'src/db/jsonDb/db1/lowdb',
    'src/db/jsonDb/db1/users'
];

jsonDbDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export async function saveSession(sessionId: string, data: any) {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    await fs.promises.writeFile(sessionFile, JSON.stringify(data));
}

export async function loadSession(sessionId: string): Promise<any> {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    
    try {
        const data = await fs.promises.readFile(sessionFile, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

export async function deleteSession(sessionId: string): Promise<void> {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    
    try {
        await fs.promises.unlink(sessionFile);
    } catch (error: any) {
        // Abaikan error jika file tidak ditemukan, jika error lain lempar ulang.
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
