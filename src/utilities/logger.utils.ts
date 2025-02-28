import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

class Logger {
    private logPath: string;
    private debugEnabled: boolean;

    constructor() {
        this.logPath = path.join(process.cwd(), 'src/db/logs');
        this.debugEnabled = process.env.DEBUG === 'true';
        this.ensureLogDirectory();
    }

    private ensureLogDirectory() {
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }

    private getLogFilePath() {
        const date = new Date();
        return path.join(this.logPath, `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`);
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    }

    private formatConsoleMessage(level: string, message: string): string {
        const timestamp = new Date().toLocaleTimeString();
        switch (level.toLowerCase()) {
            case 'info':
                return `${chalk.blue('ℹ')} ${chalk.gray(timestamp)} ${chalk.blue(message)}`;
            case 'success':
                return `${chalk.green('✓')} ${chalk.gray(timestamp)} ${chalk.green(message)}`;
            case 'warning':
            case 'warn':
                return `${chalk.yellow('⚠')} ${chalk.gray(timestamp)} ${chalk.yellow(message)}`;
            case 'error':
                return `${chalk.red('✖')} ${chalk.gray(timestamp)} ${chalk.red(message)}`;
            case 'debug':
                return `${chalk.magenta('🔍')} ${chalk.gray(timestamp)} ${chalk.magenta(message)}`;
            default:
                return `${chalk.gray(timestamp)} ${message}`;
        }
    }

    private writeToFile(message: string) {
        try {
            fs.appendFileSync(this.getLogFilePath(), message);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    info(message: string) {
        const consoleMessage = this.formatConsoleMessage('info', message);
        const fileMessage = this.formatMessage('INFO', message);
        console.log(consoleMessage);
        this.writeToFile(fileMessage);
    }

    success(message: string) {
        const consoleMessage = this.formatConsoleMessage('success', message);
        const fileMessage = this.formatMessage('SUCCESS', message);
        console.log(consoleMessage);
        this.writeToFile(fileMessage);
    }

    warning(message: string) {
        const consoleMessage = this.formatConsoleMessage('warning', message);
        const fileMessage = this.formatMessage('WARNING', message);
        console.log(consoleMessage);
        this.writeToFile(fileMessage);
    }

    // Alias untuk warning
    warn(message: string) {
        this.warning(message);
    }

    error(message: string, error?: any) {
        const errorMessage = error ? `${message}\n${error.stack || error}` : message;
        const consoleMessage = this.formatConsoleMessage('error', errorMessage);
        const fileMessage = this.formatMessage('ERROR', errorMessage);
        console.error(consoleMessage);
        this.writeToFile(fileMessage);
    }

    debug(message: string, data?: any) {
        if (this.debugEnabled) {
            const debugMessage = data ? `${message}\n${JSON.stringify(data, null, 2)}` : message;
            const consoleMessage = this.formatConsoleMessage('debug', debugMessage);
            const fileMessage = this.formatMessage('DEBUG', debugMessage);
            console.log(consoleMessage);
            this.writeToFile(fileMessage);
        }
    }

    command(name: string, source: string) {
        const message = `Command ${name} berhasil dimuat dari ${source}`;
        const consoleMessage = this.formatConsoleMessage('success', message);
        const fileMessage = this.formatMessage('COMMAND', message);
        console.log(consoleMessage);
        this.writeToFile(fileMessage);
    }

    connection(status: string, details?: string) {
        const message = details ? `${status}: ${details}` : status;
        const consoleMessage = this.formatConsoleMessage('info', message);
        const fileMessage = this.formatMessage('CONNECTION', message);
        console.log(consoleMessage);
        this.writeToFile(fileMessage);
    }
}

export const logger = new Logger();
