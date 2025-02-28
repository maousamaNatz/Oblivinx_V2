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

// Helper untuk membuat command
export const Oblivinx = {
    cmd: (options: CommandOptions): Command => ({
        ...options,
        aliases: options.aliases || [],
        category: options.category || 'misc',
        cooldown: options.cooldown || 3
    })
};

class CommandRegistry {
    private static instance: CommandRegistry;
    public commands: Map<string, Command> = new Map();
    private cooldowns: Map<string, Map<string, number>> = new Map();

    private constructor() {
        this.loadCommands();
    }

    public static getInstance(): CommandRegistry {
        if (!CommandRegistry.instance) {
            CommandRegistry.instance = new CommandRegistry();
        }
        return CommandRegistry.instance;
    }

    private async loadCommands() {
        try {
            const commandsDir = path.join(__dirname, '../command');
            const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

            for (const file of files) {
                const filePath = path.join(commandsDir, file);
                await this.loadCommandFile(filePath);
            }
        } catch (error) {
            console.error('[ERROR] Gagal memuat commands:', error);
        }
    }

    private async loadCommandFile(filePath: string) {
        try {
            const commandModule = require(filePath);
            const commands = commandModule.default || commandModule;

            // Handle array of commands
            if (Array.isArray(commands)) {
                commands.forEach(cmd => {
                    if (cmd?.name) {
                        this.register(cmd);
                        console.log(`[CMD] Berhasil memuat command: !${cmd.name} dari ${path.basename(filePath)}`);
                    }
                });
            }
            // Handle single command
            else if (commands?.name) {
                this.register(commands);
                console.log(`[CMD] Berhasil memuat command: !${commands.name} dari ${path.basename(filePath)}`);
            }
            else {
                console.warn(`[WARN] File ${path.basename(filePath)} tidak memiliki command yang valid`);
            }
        } catch (error) {
            console.error(`[ERROR] Gagal memuat command dari ${path.basename(filePath)}:`, error);
        }
    }

    public register(command: Command) {
        const mainCommand = `!${command.name.toLowerCase()}`;
        this.commands.set(mainCommand, command);
        
        // Daftarkan semua alias
        command.aliases?.forEach(alias => {
            this.commands.set(`!${alias.toLowerCase()}`, command);
        });
    }

    public async handleCommand(
        sock: WASocket,
        remoteJid: string,
        messageText: string
    ) {
        try {
            const [rawCommandName, ...args] = messageText.slice(1).split(' ');
            const commandName = rawCommandName.toLowerCase();
            
            console.log('[DEBUG] Mencoba menjalankan command:', {
                commandName,
                args,
                availableCommands: Array.from(this.commands.keys())
            });

            const command = this.commands.get(`!${commandName}`);

            if (!command) {
                console.log('[DEBUG] Command tidak ditemukan:', commandName);
                await sock.sendMessage(remoteJid, {
                    text: '❌ Perintah tidak dikenali. Ketik !help untuk melihat daftar perintah'
                });
                return;
            }

            // Cek cooldown
            const now = Date.now();
            const userCooldowns = this.cooldowns.get(command.name) ?? new Map<string, number>();
            const lastUsed = userCooldowns.get(remoteJid) ?? 0;
            const cooldownTime = lastUsed + (command.cooldown * 1000);

            if (now < cooldownTime) {
                const remaining = Math.ceil((cooldownTime - now) / 1000);
                await sock.sendMessage(remoteJid, {
                    text: `⏳ Mohon tunggu ${remaining} detik sebelum menggunakan perintah ini lagi`
                });
                return;
            }

            console.log('[DEBUG] Menjalankan command:', command.name);
            await command.run(sock, { remoteJid, text: messageText }, args);
            
            // Update cooldown
            userCooldowns.set(remoteJid, now);
            this.cooldowns.set(command.name, userCooldowns);
            
            console.log('[DEBUG] Command berhasil dijalankan:', command.name);
        } catch (error) {
            console.error('[ERROR] Gagal menjalankan perintah:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kesalahan internal';
            await sock.sendMessage(remoteJid, {
                text: `❌ Gagal menjalankan perintah: ${errorMessage}`
            });
        }
    }
}

export const commandRegistry = CommandRegistry.getInstance();
export type CommandType = Command;