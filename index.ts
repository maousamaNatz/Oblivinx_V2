import express from 'express';
import config from './src/config/config';
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { saveSession, loadSession } from './src/db/database';
import path from 'path';
import { handleCommand } from './src/helpers/command.handler';

const app = express();
app.use(express.json());

// Endpoint untuk registrasi menggunakan DB (session file)
app.post('/register', async (req, res) => {
    const { username, password, phoneNumber } = req.body;
    
    // Cek apakah user sudah terdaftar dengan mencoba memuat session berdasarkan username
    const existing = await loadSession(username);
    if (existing) {
        return res.status(400).json({ error: 'Username sudah terdaftar' });
    }

    const userData = {
        password,
        phoneNumber,
        createdAt: new Date()
    };

    // Simpan data user ke dalam session file
    await saveSession(username, userData);

    res.json({ message: 'Registrasi berhasil' });
});

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
        
        // Hanya tanggapi pesan masuk dari orang lain (bukan dari diri sendiri)
        if (!msg.key.fromMe && m.type === 'notify') {
            const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            // Gunakan command handler untuk menangani perintah
            if (messageText.startsWith('!')) {
                await handleCommand(sock, msg.key.remoteJid!, messageText);
            }
        }
    });
}

// Memulai koneksi WhatsApp
connectToWhatsApp().catch(err => console.log('Terjadi kesalahan:', err));
