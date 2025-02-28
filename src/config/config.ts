import { WASocket, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

// Konstanta
const CONNECTION_TIMEOUT = 30000;

// Logger instance
const logger = pino({ level: 'silent' });

// Baca file json
const botinfo = JSON.parse(fs.readFileSync('src/db/jsonDb/db1/botinfo.json', 'utf8'));
const changelog = fs.readFileSync('src/db/jsonDb/db1/changelog.txt', 'utf8');

// Konfigurasi bot
const config = {
    // Konfigurasi database
    databaseConfig: {
        jsonDb: 'src/db/jsonDb/db1/lowdb',
    },

    // Konfigurasi socket
    socketConfig: {
        printQRInTerminal: true,
        logger: logger,
        browser: Browsers.appropriate('Oblivinx Bot'),
        connectTimeoutMs: CONNECTION_TIMEOUT,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 5000,
        auth: {
            creds: {},
            keys: {}
        }
    },

    // Konfigurasi WhatsApp
    botInfo: {
        name: process.env.BOT_NAME || botinfo.botname,
        description: botinfo.description,
        version: botinfo.version,
        author: botinfo.creator,
        license: 'MIT'
    },

    changelog,

    // Sesi
    session: {
        path: 'src/db/sessions/',
        saveInterval: 60000 // Simpan sesi setiap 1 menit
    },

    // Konfigurasi perintah
    commandConfig: {
        prefix: '!',
        name: '',
        description: '',
        usage: '',
        aliases: [],
        category: '',
        isAdmin: false,
        isOwner: false,
        run: async (client: WASocket, message: { remoteJid: string; text: string }, args: string[]) => {
            return Promise.resolve();
        },
    }
};

export default config;
