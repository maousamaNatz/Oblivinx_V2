import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  AuthenticationState,
  BaileysEventMap,
  ConnectionState,
  Browsers
} from "@whiskeysockets/baileys";
import { logger } from "./src/utilities/logger.utils";
import config from "./src/config/config";
import { initMessageHandler } from "./src/handler/message.handler";
import { permissionHandler } from "./src/handler/permission.handler";
import { commandRegistry } from "./src/helpers/commmand.register";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

class WhatsAppBot {
  private socket: WASocket | null = null;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS: number = 5;
  private readonly RECONNECT_INTERVAL: number = 5000;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (this.socket?.user) {
        logger.info("Session utama sudah aktif");
        return;
      }

      const { state, saveCreds } = await useMultiFileAuthState(config.session.path);
      
      this.socket = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        browser: ["Oblivinx Bot", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true
      });

      // Inisialisasi command registry
      if (commandRegistry.commands.size === 0) {
        logger.info("Memuat command...");
      }

      this.setupEventHandlers(saveCreds);
      initMessageHandler(this.socket);
      permissionHandler.setup(this.socket);

      logger.success("Bot berhasil diinisialisasi");
    } catch (error) {
      logger.error("Gagal menginisialisasi bot:", error);
      process.exit(1);
    }
  }

  private setupEventHandlers(saveCreds: () => Promise<void>) {
    if (!this.socket) return;

    // Connection update handler
    this.socket.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info("QR Code baru tersedia untuk scan");
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          await this.handleReconnect();
        } else {
          logger.error("Sesi terputus karena logout");
          process.exit(1);
        }
      }

      if (connection === "open") {
        logger.success(`Bot terhubung dengan nomor: ${this.socket?.user?.id}`);
        this.resetReconnectState();
      }
    });

    // Credentials update handler
    this.socket.ev.on("creds.update", saveCreds);
  }

  private async handleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.reconnectAttempts++;

    logger.warn(`Mencoba reconnect... (Percobaan ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      logger.error("Batas maksimum reconnect tercapai");
      process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, this.RECONNECT_INTERVAL));

    try {
      await this.initialize();
    } catch (error) {
      logger.error("Gagal melakukan reconnect:", error);
      this.isReconnecting = false;
    }
  }

  private resetReconnectState() {
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

// Start the bot
new WhatsAppBot();
