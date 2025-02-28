import fs from 'fs';
import path from 'path';

class Logger {
    private logPath: string;
    private isEnabled: boolean;
    private logLevel: 'debug' | 'info' | 'warn' | 'error';

    constructor() {
        this.logPath = process.env.LOG_PATH || 'src/db/logs';
        // Memastikan logLevel sesuai dengan tipe yang diharapkan
        const validLogLevels = ['debug', 'info', 'warn', 'error'] as const;
        const defaultLogLevel = 'info' as const;
        const configuredLogLevel = process.env.LOG_LEVEL as typeof validLogLevels[number];
        
        this.logLevel = validLogLevels.includes(configuredLogLevel) 
            ? configuredLogLevel 
            : defaultLogLevel;
            
        this.isEnabled = true;
        this.initLogDirectory();
    }

    private initLogDirectory() {
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }

    // Fungsi untuk mengaktifkan logger
    enable() {
        this.isEnabled = true;
    }

    // Fungsi untuk menonaktifkan logger 
    disable() {
        this.isEnabled = false;
    }

    // Fungsi untuk mengecek status logger
    isLoggerEnabled(): boolean {
        return this.isEnabled;
    }

    private getLogFileName(): string {
        const date = new Date();
        return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}.log`;
    }

    private formatMessage(level: string, message: string): string {
        return `[${new Date().toISOString()}] [${level}] ${message}\n`;
    }

    private writeLog(logMessage: string) {
        if (this.isEnabled) {
            fs.appendFileSync(path.join(this.logPath, this.getLogFileName()), logMessage);
        }
    }

    private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    info(message: string) {
        if (this.shouldLog('info')) {
            const logMessage = this.formatMessage('INFO', message);
            this.writeLog(logMessage);
        }
    }

    error(message: string, error?: any) {
        if (this.shouldLog('error')) {
            let logMessage = this.formatMessage('ERROR', message);
            if (error) {
                logMessage += `Stack: ${error.stack}\n`;
            }
            this.writeLog(logMessage);
        }
    }

    warn(message: string) {
        if (this.shouldLog('warn')) {
            const logMessage = this.formatMessage('WARN', message);
            this.writeLog(logMessage);
        }
    }

    debug(message: string) {
        if (process.env.NODE_ENV === 'development' && this.shouldLog('debug')) {
            const logMessage = this.formatMessage('DEBUG', message);
            this.writeLog(logMessage);
        }
    }
}

export const logger = new Logger();
