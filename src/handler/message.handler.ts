import { WASocket, proto, AnyMessageContent } from '@whiskeysockets/baileys';
import { commandRegistry } from '../helpers/commmand.register';
import { permissionHandler } from './permission.handler';
import { logger } from '../utilities/logger.utils';
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
        logger.debug('Menerima pesan baru', {
            type: message.message ? Object.keys(message.message)[0] : 'unknown',
            message: message
        });
        
        // Validasi dasar pesan
        if (!message.message || message.key.fromMe) {
            logger.debug('Pesan diabaikan: dari diri sendiri atau tidak ada konten');
            return;
        }

        // Ekstrak metadata pesan
        const remoteJid = message.key.remoteJid!;
        const sender = message.key.participant || remoteJid;
        const messageType = Object.keys(message.message)[0];
        
        logger.debug('Metadata pesan', {
            jid: remoteJid,
            sender: sender,
            type: messageType
        });
        
        // Sistem blacklist pengguna
        try {
            if (fs.existsSync(BLACKLIST_FILE)) {
                const blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
                if (blacklist.users?.includes(sender)) {
                    logger.warning(`Pengguna ${sender} terblokir`);
                    await sock.sendMessage(remoteJid, {
                        text: '⛔ Anda terblokir dari menggunakan bot ini'
                    });
                    return;
                }
            }
        } catch (error) {
            logger.error('Error membaca blacklist', error);
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
            logger.debug('Extracted text', { text: foundText });
            return foundText;
        };

        const textMessage = extractMessageText();
        if (!textMessage) {
            logger.debug('Tidak ada teks yang bisa diekstrak dari pesan');
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
            logger.error('Gagal menulis log', error);
        }

        // Deteksi dan normalisasi perintah
        const isCommand = /^[!/](?:[\wá-žÁ-Ž]+)/.test(textMessage);
        logger.debug('Command detection', { isCommand, text: textMessage });
        
        if (isCommand) {
            logger.info(`Menjalankan command: ${textMessage}`);
            try {
                logger.debug('Commands yang tersedia', {
                    commands: Array.from(commandRegistry.commands.keys())
                });
                await commandRegistry.handleCommand(sock, remoteJid, textMessage);
                logger.success(`Command berhasil dijalankan: ${textMessage}`);
            } catch (error) {
                logger.error('Gagal memproses command', error);
                await sock.sendMessage(remoteJid, {
                    text: '❌ Terjadi kesalahan saat memproses perintah'
                });
            }
        } else {
            logger.debug('Memproses sebagai pesan biasa');
            await handleRegularMessage(sock, remoteJid, textMessage, message, sender);
        }
    } catch (error) {
        logger.error('Error dalam handleMessage', error);
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
            logger.debug('Auto-replies loaded', autoReplies);
            
            const matchedReply = autoReplies.auto_replies?.find(({ trigger }: { trigger: string }) => 
                new RegExp(`\\b${trigger}\\b`, 'i').test(messageText)
            );

            if (matchedReply) {
                logger.debug('Matched auto-reply', matchedReply);
                const messageContent: AnyMessageContent = {
                    text: matchedReply.response,
                    contextInfo: {
                        quotedMessage: originalMessage.message
                    }
                };
                await sock.sendMessage(remoteJid, messageContent);
                logger.success('Auto-reply terkirim');
            }
        }
    } catch (error) {
        logger.error('Error dalam handleRegularMessage', error);
    }
};

/**
 * Sistem inisialisasi handler canggih
 */
export const initMessageHandler = (sock: WASocket) => {
    // Event handler utama
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        logger.debug('Message upsert', { type, count: messages.length });
        
        // Hanya proses pesan tipe 'notify'
        if (type !== 'notify') return;

        for (const message of messages) {
            try {
                // Log pesan mentah untuk debugging
                logger.debug('Raw message', { message: JSON.stringify(message, null, 2) });
                
                // Pastikan pesan valid
                if (!message.message) {
                    logger.debug('Pesan kosong, diabaikan');
                    continue;
                }

                await handleMessage(sock, message);
            } catch (error) {
                logger.error('Gagal memproses pesan', error);
                if (message.key.remoteJid) {
                    try {
                        await sock.sendMessage(message.key.remoteJid, {
                            text: '⚠️ Terjadi kesalahan saat memproses pesan Anda'
                        });
                    } catch (sendError) {
                        logger.error('Gagal mengirim pesan error', sendError);
                    }
                }
            }
        }
    });

    // Event handler tambahan
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        logger.debug('Group update', { action, group: id });
        if (action === 'add') {
            try {
                await sock.sendMessage(id, {
                    text: `Selamat datang ${participants.map(p => `@${p.split('@')[0]}`).join(' ')}! 🎉`
                });
            } catch (error) {
                logger.error('Gagal mengirim pesan welcome', error);
            }
        }
    });

    logger.success('Sistem penanganan pesan aktif');
};