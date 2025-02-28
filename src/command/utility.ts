import { Oblivinx } from '../helpers/commmand.register';
import { WASocket } from '@whiskeysockets/baileys';
import os from 'os';

const commands = [
    // Command untuk melihat status sistem
    Oblivinx.cmd({
        name: 'status',
        description: 'Menampilkan status sistem bot',
        usage: '!status',
        aliases: ['stats', 'sys'],
        category: 'utility',
        cooldown: 10,
        run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
            const uptime = process.uptime();
            const memory = process.memoryUsage();
            const status = `🤖 *Status Bot*\n\n` +
                         `⏱️ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s\n` +
                         `💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB\n` +
                         `💻 Platform: ${os.platform()} ${os.release()}\n` +
                         `🔄 Node: ${process.version}`;
            
            await client.sendMessage(message.remoteJid, { text: status });
        }
    }),

    // Command untuk melihat info pengguna
    Oblivinx.cmd({
        name: 'userinfo',
        description: 'Menampilkan informasi pengguna',
        usage: '!userinfo',
        aliases: ['user', 'ui'],
        category: 'utility',
        cooldown: 5,
        run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
            const sender = message.remoteJid.split('@')[0];
            const info = `👤 *Info Pengguna*\n\n` +
                        `📱 Nomor: ${sender}\n` +
                        `🏷️ Tipe: ${message.remoteJid.includes('g.us') ? 'Group' : 'Private'}\n`;
            
            await client.sendMessage(message.remoteJid, { text: info });
        }
    }),

    // Command untuk melihat waktu server
    Oblivinx.cmd({
        name: 'time',
        description: 'Menampilkan waktu server',
        usage: '!time',
        aliases: ['waktu', 't'],
        category: 'utility',
        cooldown: 3,
        run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
            const now = new Date();
            const time = `🕒 *Waktu Server*\n\n` +
                        `📅 Tanggal: ${now.toLocaleDateString('id-ID')}\n` +
                        `⏰ Waktu: ${now.toLocaleTimeString('id-ID')}\n` +
                        `🌐 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
            
            await client.sendMessage(message.remoteJid, { text: time });
        }
    })
];

export default commands; 