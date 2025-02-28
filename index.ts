import express from 'express';
import config from './src/config/config';
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { saveSession, loadSession } from './src/db/database';
import path from 'path';
import { handleCommand } from './src/helpers/command.handler';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/frontends')));

app.listen(config.port, () => {
    console.log(`Server berjalan di port ${config.port}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: 60000
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
        
        console.log('Koneksi update:', update);
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        if (!msg.key.fromMe && m.type === 'notify') {
            const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            if (messageText.startsWith('!')) {
                // Handle commands
                await handleCommand(sock, msg.key.remoteJid!, messageText);
            } else {
                // Handle normal chat (optional)
                await sock.sendMessage(msg.key.remoteJid!, {
                    text: 'Hai! Saya adalah bot. Ketik !help untuk melihat daftar perintah yang tersedia.'
                });
            }
        }
    });
}

// Memulai koneksi WhatsApp
connectToWhatsApp().catch(err => console.log('Terjadi kesalahan:', err));
