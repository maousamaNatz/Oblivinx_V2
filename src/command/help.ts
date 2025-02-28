import { Oblivinx, commandRegistry } from '../helpers/commmand.register';
import { WASocket } from '@whiskeysockets/baileys';
import { CommandType } from '../helpers/commmand.register';

export default Oblivinx.cmd({
    name: 'help',
    description: 'Menampilkan daftar perintah',
    usage: '!help',
    aliases: ['h'],
    category: 'general', 
    cooldown: 5,
    run: async (client: WASocket, message: { remoteJid: string, text: string }, args: string[]) => {
        const commands = Array.from(commandRegistry.commands.values()) as CommandType[];
        
        const commandList = commands
            .filter((cmd, index, self) => 
                self.findIndex((c: CommandType) => c.name === cmd.name) === index
            )
            .map((cmd: CommandType) => `• !${cmd.name} - ${cmd.description}`)
            .join('\n');

        await client.sendMessage(message.remoteJid, {
            text: `📚 *Daftar Perintah*\n\n${commandList}\n\n` +
                  `Gunakan !help <command> untuk info lebih detail`
        });
    }
});
