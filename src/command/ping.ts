import { Oblivinx } from '../helpers/commmand.register';
import { WASocket } from '@whiskeysockets/baileys';

const commands = [
    Oblivinx.cmd({
        name: 'ping',
        description: 'Mengecek status bot',
        usage: '!ping',
        aliases: ['p'],
        category: 'general',
        cooldown: 5,
        run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
            const start = Date.now();
            await client.sendMessage(message.remoteJid, { text: 'Mengecek...' });
            const latency = Date.now() - start;
            
            await client.sendMessage(message.remoteJid, {
                text: `🏓 Pong!\nLatency: ${latency}ms`
            });
        }
    }),

    Oblivinx.cmd({
        name: 'test',
        description: 'Command test sederhana', 
        usage: '!test',
        aliases: [],
        category: 'general',
        cooldown: 0,
        run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
            await client.sendMessage(message.remoteJid, {
                text: 'Test berhasil! Bot berfungsi dengan baik.'
            });
        }
    })
];

export default commands;