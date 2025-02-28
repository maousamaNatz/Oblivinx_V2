import { WASocket } from '@whiskeysockets/baileys';

interface User {
    password: string;
    phoneNumber: string;
    createdAt: Date;
}

const users = new Map<string, User>();

export async function handleRegisterCommand(
    sock: WASocket, 
    remoteJid: string,
    messageText: string
) {
    const args = messageText.split(' ');
    
    if(args.length !== 3) {
        await sock.sendMessage(remoteJid, {
            text: 'Format: !register <username> <password>'
        });
        return;
    }

    const [_, username, password] = args;

    if(users.has(username)) {
        await sock.sendMessage(remoteJid, {
            text: 'Username sudah terdaftar!'
        });
        return;
    }

    users.set(username, {
        password,
        phoneNumber: remoteJid,
        createdAt: new Date()
    });

    await sock.sendMessage(remoteJid, {
        text: 'Registrasi berhasil!\nGunakan username dan password untuk login.'
    });
}
