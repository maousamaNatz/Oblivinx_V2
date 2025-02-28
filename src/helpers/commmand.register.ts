import { WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

interface Command {
    name: string;
    description: string;
    usage: string;
    aliases: string[];
    category: string;
    cooldown: number;
    run: (client: WASocket, message: CommandMessage, args: string[]) => Promise<void>;
}

interface CommandOptions {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    category?: string;
    cooldown?: number;
    run: (client: WASocket, message: CommandMessage, args: string[]) => Promise<void>;
}

interface CommandMessage {
    remoteJid: string;
    text: string;
}

export const Oblivinx = {
    cmd: (options: CommandOptions): Command => ({
        name: options.name,
        description: options.description,
        usage: options.usage,
        aliases: options.aliases || [],
        category: options.category || 'general',
        cooldown: options.cooldown ?? 5,
        run: options.run
    })
};

export type CommandType = ReturnType<typeof Oblivinx.cmd>;

class CommandRegistry {
    private static instance: CommandRegistry;
    public commands = new Map<string, Command>();
    private cooldowns = new Map<string, Map<string, number>>();

    private constructor() {
        this.loadCommandsFromFolder();
    }

    public static getInstance(): CommandRegistry {
        if (!CommandRegistry.instance) {
            CommandRegistry.instance = new CommandRegistry();
        }
        return CommandRegistry.instance;
    }

    private loadCommandsFromFolder() {
        const commandsPath = path.join(__dirname, '../command');
        
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }

        fs.readdirSync(commandsPath)
            .filter(file => ['.ts', '.js'].some(ext => file.endsWith(ext)))
            .forEach(file => this.loadCommandFile(path.join(commandsPath, file)));
    }

    private loadCommandFile(filePath: string) {
        try {
            const commandModule = require(filePath);
            const cmd = commandModule.default || commandModule;
            
            if (!cmd?.name) {
                console.warn(`[WARN] File ${path.basename(filePath)} tidak memiliki command yang valid`);
                return;
            }

            this.register(cmd);
            console.log(`[CMD] Berhasil memuat command: !${cmd.name}`);
        } catch (error) {
            console.error(`[ERROR] Gagal memuat command dari ${path.basename(filePath)}:`, error);
        }
    }

    public register(command: Command) {
        const mainCommand = `!${command.name.toLowerCase()}`;
        this.commands.set(mainCommand, command);
        
        // Daftarkan semua alias
        command.aliases.forEach(alias => {
            this.commands.set(`!${alias.toLowerCase()}`, command);
        });
    }

    public async handleCommand(
        sock: WASocket,
        remoteJid: string,
        messageText: string
    ) {
        const [rawCommandName, ...args] = messageText.slice(1).split(' ');
        const commandName = rawCommandName.toLowerCase();
        const command = this.commands.get(`!${commandName}`);

        if (!command) {
            return sock.sendMessage(remoteJid, {
                text: '❌ Perintah tidak dikenali. Ketik !help untuk melihat daftar perintah'
            });
        }

        // Cek cooldown
        const now = Date.now();
        const userCooldowns = this.cooldowns.get(command.name) ?? new Map<string, number>();
        const lastUsed = userCooldowns.get(remoteJid) ?? 0;
        const cooldownTime = lastUsed + (command.cooldown * 1000);

        if (now < cooldownTime) {
            const remaining = Math.ceil((cooldownTime - now) / 1000);
            return sock.sendMessage(remoteJid, {
                text: `⏳ Mohon tunggu ${remaining} detik sebelum menggunakan perintah ini lagi`
            });
        }

        try {
            await command.run(sock, { remoteJid, text: messageText }, args);
            userCooldowns.set(remoteJid, now);
            this.cooldowns.set(command.name, userCooldowns);
        } catch (error) {
            console.error('[ERROR] Gagal menjalankan perintah:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kesalahan internal';
            sock.sendMessage(remoteJid, {
                text: `❌ Gagal menjalankan perintah: ${errorMessage}`
            });
        }
    }
}

export const commandRegistry = CommandRegistry.getInstance();