import { WASocket, proto, AnyMessageContent } from '@whiskeysockets/baileys';
import { commandRegistry } from '../helpers/commmand.register';
import { permissionHandler } from './permission.handler';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Konfigurasi sistem
const BLACKLIST_FILE = 'src/db/jsonDb/db1/lowdb/blacklist.json';
const AUTO_REPLY_FILE = 'src/db/jsonDb/db1/lowdb/auto_replies.json';

/**
 * Memproses pesan masuk dengan fitur lengkap
 */
export const handleMessage = async (
    sock: WASocket, 
    message: proto.IWebMessageInfo
) => {
    // Validasi dasar pesan
    if (!message.message || message.key.fromMe) return;

    // Ekstrak metadata pesan
    const remoteJid = message.key.remoteJid!;
    const sender = message.key.participant || remoteJid;
    const messageType = Object.keys(message.message)[0];
    
    // Sistem blacklist pengguna
    const blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
    if (blacklist.users.includes(sender)) {
        await sock.sendMessage(remoteJid, {
            text: '⛔ Anda terblokir dari menggunakan bot ini'
        });
        return;
    }

    // Ekstrak konten pesan multi-format
    const extractMessageText = () => {
        const msg = message.message!;
        return [
            msg.conversation,
            msg.extendedTextMessage?.text,
            msg.imageMessage?.caption,
            msg.videoMessage?.caption,
            msg.documentMessage?.caption,
            msg.locationMessage?.comment,
            msg.buttonsResponseMessage?.selectedButtonId,
            msg.listResponseMessage?.title
        ].find(text => typeof text === 'string');
    };

    const textMessage = extractMessageText();
    if (!textMessage) return;

    // Sistem logging pesan
    const logMessage = `[${new Date().toISOString()}] Dari: ${sender} - Pesan: ${textMessage}\n`;
    fs.appendFileSync('src/db/message_logs.txt', logMessage);

    // Deteksi dan normalisasi perintah
    const isCommand = /^[!/](?:[\wá-žÁ-Ž]+)/.test(textMessage);
    if (isCommand) {
        await handleCommand(sock, remoteJid, textMessage, sender);
    } else {
        await handleRegularMessage(sock, remoteJid, textMessage, message, sender);
    }
};

/**
 * Sistem penanganan perintah canggih
 */
const handleCommand = async (
    sock: WASocket,
    remoteJid: string,
    messageText: string,
    sender: string
) => {
    // Normalisasi dan validasi perintah
    const normalizedText = messageText.replace(/^[!/]/, '!').replace(/ +/g, ' ');
    const [command, ...args] = normalizedText.slice(1).split(' ');

    // Middleware sebelum eksekusi
    const beforeHandle = async () => {
        // Cek izin pengguna menggunakan permissionHandler
        const isAdmin = await permissionHandler.isAdmin(sender);
        
        if (command === 'admincmd' && !isAdmin) {
            await sock.sendMessage(remoteJid, {
                text: '❌ Akses ditolak: Hanya admin yang bisa menggunakan perintah ini'
            });
            return false;
        }
        return true;
    };

    if (!await beforeHandle()) return;

    // Eksekusi perintah dengan error handling terperinci
    try {
        await commandRegistry.handleCommand(sock, remoteJid, normalizedText);
        
        // Logging perintah sukses
        const cmdLog = `[${new Date().toISOString()}] Perintah: ${command} - Pengguna: ${sender}\n`;
        fs.appendFileSync('src/db/command_logs.txt', cmdLog);
    } catch (error) {
        console.error(`[ERROR] Gagal mengeksekusi perintah ${command}:`, error);
        
        const errorMessage = error instanceof Error ? `
            ⚠️ Error: ${error.message}
            🧩 Stack: ${error.stack?.split('\n')[0]}
            📌 Perintah: ${normalizedText}
        ` : 'Terjadi kesalahan internal';

        await sock.sendMessage(remoteJid, { 
            text: errorMessage.replace(/ {4}/g, '') 
        });
    }
};

/**
 * Sistem penanganan pesan reguler canggih
 */
const handleRegularMessage = async (
    sock: WASocket,
    remoteJid: string,
    messageText: string,
    originalMessage: proto.IWebMessageInfo,
    sender: string
) => {
    // Auto-reply system
    const autoReplies = JSON.parse(fs.readFileSync(AUTO_REPLY_FILE, 'utf8'));
    const matchedReply = autoReplies.find(({ keywords }: { keywords: string[] }) => 
        keywords.some((kw: string) => 
            new RegExp(`\\b${kw}\\b`, 'i').test(messageText)
        )
    );

    if (matchedReply) {
        const messageContent: AnyMessageContent = {
            text: matchedReply.response,
            contextInfo: {
                quotedMessage: originalMessage.message
            }
        };
        await sock.sendMessage(remoteJid, messageContent);
    }

    // AI-based message processing (placeholder untuk integrasi AI)
    if (messageText.length > 20 && Math.random() < 0.3) {
        const messageContent: AnyMessageContent = {
            text: '🤖 Pesan Anda telah dicatat dan akan diproses lebih lanjut',
            contextInfo: {
                quotedMessage: originalMessage.message
            }
        };
        await sock.sendMessage(remoteJid, messageContent);
    }
};

/**
 * Sistem inisialisasi handler canggih
 */
export const initMessageHandler = (sock: WASocket) => {
    // Event handler utama
    sock.ev.on('messages.upsert', async ({ messages }) => {
        await Promise.all(messages.map(async message => {
            try {
                await handleMessage(sock, message);
            } catch (error) {
                console.error('[ERROR] Gagal memproses pesan:', error);
                await sock.sendMessage(message.key.remoteJid!, {
                    text: '⚠️ Terjadi kesalahan saat memproses pesan Anda'
                });
            }
        }));
    });

    // Event handler tambahan
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (action === 'add') {
            await sock.sendMessage(id, {
                text: `Selamat datang ${participants.map(p => `@${p.split('@')[0]}`).join(' ')}! 🎉`
            });
        }
    });

    // Sistem notifikasi status
    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') {
            sock.sendMessage('status@broadcast', {
                text: '🟢 Sistem bot online\n' + 
                      `⏰ Waktu: ${new Date().toLocaleString()}\n` +
                      `💻 Host: ${os.hostname()}\n` +
                      `👑 Admin: ${permissionHandler.isAdmin}`
            });
        }
    });

    console.log('[HANDLER] Sistem penanganan pesan canggih aktif\n' +
                `🛡️ Sistem keamanan: Aktif\n` +
                `📊 Auto-reply: ${JSON.parse(fs.readFileSync(AUTO_REPLY_FILE, 'utf8')).length} aturan\n` +
                `⏱️ Waktu inisialisasi: ${new Date().toLocaleTimeString()}`);
};