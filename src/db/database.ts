import path from 'path';
import fs from 'fs';
import config from '../config/config';
import { logger } from '../utilities/logger.utils';

// Buat folder sessions jika belum ada
const sessionsDir = path.join(process.cwd(), config.session.path);
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
    logger.info(`Direktori session dibuat: ${sessionsDir}`);
}

// Tambahkan pembuatan direktori untuk file JSON
const jsonDbDirs = [
    'src/db/jsonDb/db1/lowdb',
    'src/db/jsonDb/db1/users'
];

jsonDbDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Direktori JSON dibuat: ${dir}`);
    }
});

export async function saveSession(sessionId: string, data: any) {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    try {
        await fs.promises.writeFile(sessionFile, JSON.stringify(data));
        logger.success(`Session berhasil disimpan: ${sessionId}`);
    } catch (error) {
        logger.error(`Gagal menyimpan session ${sessionId}:`, error);
        throw error;
    }
}

export async function loadSession(sessionId: string): Promise<any> {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    
    try {
        const data = await fs.promises.readFile(sessionFile, 'utf-8');
        logger.success(`Session berhasil dimuat: ${sessionId}`);
        return JSON.parse(data);
    } catch (error) {
        logger.debug(`Session tidak ditemukan: ${sessionId}`);
        return null;
    }
}

export async function deleteSession(sessionId: string): Promise<void> {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    
    try {
        await fs.promises.unlink(sessionFile);
        logger.success(`Session berhasil dihapus: ${sessionId}`);
    } catch (error: any) {
        // Abaikan error jika file tidak ditemukan, jika error lain lempar ulang.
        if (error.code !== 'ENOENT') {
            logger.error(`Gagal menghapus session ${sessionId}:`, error);
            throw error;
        }
        logger.debug(`Session tidak ditemukan untuk dihapus: ${sessionId}`);
    }
}
