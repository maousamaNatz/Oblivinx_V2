import { WASocket } from '@whiskeysockets/baileys';

interface CommandHandler {
    command: string;
    handler: (sock: WASocket, remoteJid: string, messageText: string) => Promise<void>;
}

const commandHandlers: CommandHandler[] = [
    {
        command: '!help',
        handler: async (sock, remoteJid) => {
            await sock.sendMessage(remoteJid, {
                text: `*🤖 Daftar Perintah Bot:*\n\n` +
                      `!help - Menampilkan daftar perintah\n` +
                      `!ping - Mengecek bot aktif\n` +
                      `!info - Informasi tentang bot`
            });
        }
    },
    {
        command: '!ping',
        handler: async (sock, remoteJid) => {
            await sock.sendMessage(remoteJid, {
                text: '🟢 Pong! Bot aktif'
            });
        }
    },
    {
        command: '!info',
        handler: async (sock, remoteJid) => {
            await sock.sendMessage(remoteJid, {
                text: `*🤖 Informasi Bot*\n\n` +
                      `Nama: OrbitStudio Bot\n` +
                      `Versi: 1.0.0\n` +
                      `Creator: Natzsixn\n` +
                      `Status: Online`
            });
        }
    }
];

export async function handleCommand(
    sock: WASocket,
    remoteJid: string, 
    messageText: string
) {
    const command = messageText.split(' ')[0].toLowerCase();
    
    const handler = commandHandlers.find(h => h.command === command);
    
    if(!handler) {
        await sock.sendMessage(remoteJid, {
            text: '❌ Perintah tidak dikenali.\nKetik !help untuk melihat daftar perintah.'
        });
        return;
    }

    try {
        await handler.handler(sock, remoteJid, messageText);
    } catch(error) {
        console.error('Error menjalankan perintah:', error);
        await sock.sendMessage(remoteJid, {
            text: '❌ Terjadi kesalahan saat menjalankan perintah.'
        });
    }
}
