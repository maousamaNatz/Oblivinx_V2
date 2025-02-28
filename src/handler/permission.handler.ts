import { WASocket } from '@whiskeysockets/baileys';
import fs from 'fs';

// Konfigurasi file permission
const ADMINS_FILE = 'src/db/jsonDb/db1/lowdb/admins.json';
const OWNER_FILE = 'src/db/jsonDb/db1/lowdb/owner.json';

class PermissionHandler {
    private socket: WASocket | null = null;
    private admins: string[] = [];
    private owner: string = '';

    setup(sock: WASocket) {
        this.socket = sock;
        this.loadPermissions();
    }

    private loadPermissions() {
        try {
            // Muat daftar admin
            const adminData = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
            this.admins = adminData.admins;

            // Muat owner
            const ownerData = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            this.owner = ownerData.owner;
        } catch (error) {
            console.error('Gagal memuat data permission:', error);
            // Inisialisasi default jika file tidak ada
            this.admins = [];
            this.owner = '';
        }
    }

    // Cek apakah user adalah admin bot
    isAdmin(userId: string): boolean {
        return this.admins.includes(userId);
    }

    // Cek apakah user adalah admin grup
    async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
        if (!this.socket) return false;
        
        try {
            const groupMetadata = await this.socket.groupMetadata(groupId);
            const participant = groupMetadata.participants.find(p => p.id === userId);
            return participant?.admin === 'admin' || participant?.admin === 'superadmin';
        } catch (error) {
            console.error('Gagal mengecek admin grup:', error);
            return false;
        }
    }

    // Cek apakah user adalah owner
    isOwner(userId: string): boolean {
        return userId === this.owner;
    }

    // Tambah admin bot baru
    async addAdmin(userId: string, requesterId: string): Promise<boolean> {
        if (!this.isOwner(requesterId)) {
            return false;
        }

        if (!this.admins.includes(userId)) {
            this.admins.push(userId);
            await this.saveAdmins();
            return true;
        }
        return false;
    }

    // Hapus admin bot
    async removeAdmin(userId: string, requesterId: string): Promise<boolean> {
        if (!this.isOwner(requesterId)) {
            return false;
        }

        const index = this.admins.indexOf(userId);
        if (index > -1) {
            this.admins.splice(index, 1);
            await this.saveAdmins();
            return true;
        }
        return false;
    }

    // Simpan perubahan admin ke file
    private async saveAdmins() {
        try {
            fs.writeFileSync(ADMINS_FILE, JSON.stringify({ admins: this.admins }, null, 2));
        } catch (error) {
            console.error('Gagal menyimpan data admin:', error);
            throw error;
        }
    }

    // Cek permission untuk command tertentu
    async checkPermission(userId: string, groupId: string | null, command: { isAdmin?: boolean, isOwner?: boolean, isGroupAdmin?: boolean }): Promise<boolean> {
        if (command.isOwner && !this.isOwner(userId)) {
            return false;
        }

        if (command.isAdmin && !this.isAdmin(userId) && !this.isOwner(userId)) {
            return false;
        }

        if (command.isGroupAdmin && groupId) {
            const isGroupAdm = await this.isGroupAdmin(groupId, userId);
            if (!isGroupAdm && !this.isOwner(userId)) {
                return false;
            }
        }

        return true;
    }
}

export const permissionHandler = new PermissionHandler();
