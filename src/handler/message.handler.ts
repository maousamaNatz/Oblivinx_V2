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
    try {
        console.log('[DEBUG] Menerima pesan baru');
        console.log('[DEBUG] Message type:', message.message ? Object.keys(message.message)[0] : 'unknown');
        console.log('[DEBUG] Full message object:', JSON.stringify(message, null, 2));
        
        // Validasi dasar pesan
        if (!message.message || message.key.fromMe) {
            console.log('[DEBUG] Pesan diabaikan: dari diri sendiri atau tidak ada konten');
            return;
        }

        // Ekstrak metadata pesan
        const remoteJid = message.key.remoteJid!;
        const sender = message.key.participant || remoteJid;
        const messageType = Object.keys(message.message)[0];
        
        console.log(`[DEBUG] Metadata pesan - JID: ${remoteJid}, Sender: ${sender}, Type: ${messageType}`);
        
        // Sistem blacklist pengguna
        try {
            if (fs.existsSync(BLACKLIST_FILE)) {
                const blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
                if (blacklist.users?.includes(sender)) {
                    console.log(`[DEBUG] Pengguna ${sender} terblokir`);
                    await sock.sendMessage(remoteJid, {
                        text: '⛔ Anda terblokir dari menggunakan bot ini'
                    });
                    return;
                }
            }
        } catch (error) {
            console.error('[ERROR] Error membaca blacklist:', error);
        }

        // Ekstrak konten pesan multi-format
        const extractMessageText = () => {
            const msg = message.message!;
            
            // Daftar tipe pesan yang valid dengan propertinya
            const texts = [
                msg.conversation,
                msg.extendedTextMessage?.text,
                msg.imageMessage?.caption,
                msg.videoMessage?.caption,
                msg.documentMessage?.caption,
                msg.locationMessage?.comment,
                msg.contactMessage?.vcard,
                msg.buttonsResponseMessage?.selectedButtonId,
                msg.templateButtonReplyMessage?.selectedId,
                msg.listResponseMessage?.title,
                msg.listResponseMessage?.singleSelectReply?.selectedRowId
            ];
            
            const foundText = texts.find(text => typeof text === 'string' && text.trim().length > 0);
            console.log('[DEBUG] Extracted text:', foundText);
            return foundText;
        };

        const textMessage = extractMessageText();
        if (!textMessage) {
            console.log('[DEBUG] Tidak ada teks yang bisa diekstrak dari pesan');
            return;
        }

        // Sistem logging pesan
        const logMessage = `[${new Date().toISOString()}] Dari: ${sender} - Pesan: ${textMessage}\n`;
        try {
            const logDir = 'src/db/logs';
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(path.join(logDir, 'messages.txt'), logMessage);
        } catch (error) {
            console.error('[ERROR] Gagal menulis log:', error);
        }

        // Deteksi dan normalisasi perintah
        const isCommand = /^[!/](?:[\wá-žÁ-Ž]+)/.test(textMessage);
        console.log(`[DEBUG] Is command: ${isCommand}, Text: ${textMessage}`);
        
        if (isCommand) {
            console.log(`[DEBUG] Mencoba menjalankan command: ${textMessage}`);
            try {
                console.log('[DEBUG] Commands yang tersedia:', Array.from(commandRegistry.commands.keys()));
                await commandRegistry.handleCommand(sock, remoteJid, textMessage);
                console.log('[DEBUG] Command berhasil dijalankan');
            } catch (error) {
                console.error('[ERROR] Gagal memproses command:', error);
                await sock.sendMessage(remoteJid, {
                    text: '❌ Terjadi kesalahan saat memproses perintah'
                });
            }
        } else {
            console.log('[DEBUG] Memproses sebagai pesan biasa');
            await handleRegularMessage(sock, remoteJid, textMessage, message, sender);
        }
    } catch (error) {
        console.error('[ERROR] Error dalam handleMessage:', error);
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
    try {
        // Auto-reply system
        if (fs.existsSync(AUTO_REPLY_FILE)) {
            const autoReplies = JSON.parse(fs.readFileSync(AUTO_REPLY_FILE, 'utf8'));
            console.log('[DEBUG] Auto-replies loaded:', autoReplies);
            
            const matchedReply = autoReplies.auto_replies?.find(({ trigger }: { trigger: string }) => 
                new RegExp(`\\b${trigger}\\b`, 'i').test(messageText)
            );

            if (matchedReply) {
                console.log('[DEBUG] Matched auto-reply:', matchedReply);
                const messageContent: AnyMessageContent = {
                    text: matchedReply.response,
                    contextInfo: {
                        quotedMessage: originalMessage.message
                    }
                };
                await sock.sendMessage(remoteJid, messageContent);
                console.log('[DEBUG] Auto-reply sent');
            }
        }
    } catch (error) {
        console.error('[ERROR] Error dalam handleRegularMessage:', error);
    }
};

/**
 * Sistem inisialisasi handler canggih
 */
export const initMessageHandler = (sock: WASocket) => {
    // Event handler utama
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`[DEBUG] Message upsert - Type: ${type}, Count: ${messages.length}`);
        
        // Hanya proses pesan tipe 'notify'
        if (type !== 'notify') return;

        for (const message of messages) {
            try {
                // Log pesan mentah untuk debugging
                console.log('[DEBUG] Raw message:', JSON.stringify(message, null, 2));
                
                // Pastikan pesan valid
                if (!message.message) {
                    console.log('[DEBUG] Pesan kosong, diabaikan');
                    continue;
                }

                await handleMessage(sock, message);
            } catch (error) {
                console.error('[ERROR] Gagal memproses pesan:', error);
                if (message.key.remoteJid) {
                    try {
                        await sock.sendMessage(message.key.remoteJid, {
                            text: '⚠️ Terjadi kesalahan saat memproses pesan Anda'
                        });
                    } catch (sendError) {
                        console.error('[ERROR] Gagal mengirim pesan error:', sendError);
                    }
                }
            }
        }
    });

    // Event handler tambahan
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        console.log(`[DEBUG] Group update - Action: ${action}, Group: ${id}`);
        if (action === 'add') {
            try {
                await sock.sendMessage(id, {
                    text: `Selamat datang ${participants.map(p => `@${p.split('@')[0]}`).join(' ')}! 🎉`
                });
            } catch (error) {
                console.error('[ERROR] Gagal mengirim pesan welcome:', error);
            }
        }
    });

    console.log('[HANDLER] Sistem penanganan pesan canggih aktif\n' +
                `🛡️ Sistem keamanan: Aktif\n` +
                `⏱️ Waktu inisialisasi: ${new Date().toLocaleTimeString()}`);
};