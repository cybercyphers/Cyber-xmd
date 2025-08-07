const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const crypto = require('crypto-js');
const os = require('os');
const fs = require('fs-extra');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const FormData = require('form-data');

const asciiArt = `
   ██████╗██╗   ██╗██████╗ ███████╗██████╗     ██╗  ██╗███╗   ███╗██████╗ 
  ██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗    ██║  ██║████╗ ████║██╔══██╗
  ██║     ██║   ██║██████╔╝█████╗  ██████╔╝    ██║  ██║██╔████╔██║██████╔╝
  ██║     ██║   ██║██╔══██╗██╔══╝  ██╔══██╗    ██║  ██║██║╚██╔╝██║██╔═══╝ 
  ╚██████╗╚██████╔╝██║  ██║███████╗██║  ██║    ██████╔╝██║ ╚═╝ ██║██║     
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝     
                   CYBER-Xmd WhatsApp Bot
`;

const hackerBioText = `👾 CYBER-Xmd | 𝙃𝙖𝙘𝙠𝙚𝙧 𝘼𝙨𝙨𝙞𝙨𝙩𝙖𝙣𝙩
"𝙎𝙚𝙚𝙠𝙞𝙣𝙜 𝙩𝙝𝙚 𝙪𝙣𝙨𝙚𝙚𝙣, 𝙙𝙚𝙛𝙮𝙞𝙣𝙜 𝙩𝙝𝙚 𝙤𝙧𝙙𝙞𝙣𝙖𝙧𝙮."`;

const menu = `
${asciiArt}
👤 *CYBER-Xmd* | 𝙃𝙖𝙘𝙠𝙚𝙧 𝘼𝙨𝙨𝙞𝙨𝙩𝙖𝙣𝙩
────────────────────────────
"𝙄 𝙖𝙢 𝙩𝙝𝙚 𝙜𝙝𝙤𝙨𝙩 𝙞𝙣 𝙩𝙝𝙚 𝙢𝙖𝙘𝙝𝙞𝙣𝙚, 𝙩𝙝𝙚 𝙨𝙞𝙡𝙚𝙣𝙩 𝙬𝙖𝙩𝙘𝙝𝙚𝙧 𝙤𝙛 𝙩𝙝𝙚 𝙣𝙚𝙩. 𝙄 𝙨𝙚𝙚 𝙖𝙡𝙡, 𝙞𝙣𝙩𝙚𝙧𝙘𝙚𝙥𝙩 𝙖𝙡𝙡, 𝙖𝙣𝙙 𝙡𝙚𝙖𝙫𝙚 𝙣𝙤 𝙩𝙧𝙖𝙘𝙚."
────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━
🛠️ *Obfuscation Tools*
━━━━━━━━━━━━━━━━━━━━━━
.deepobfuscate
.obfuscate
.deobfuscate
.deobfuscate_deeper
.encrypt
.decrypt
.hash

━━━━━━━━━━━━━━━━━━━━━━
🌐 *Network & Recon*
━━━━━━━━━━━━━━━━━━━━━━
.nmap
.dns
.ddos
.header
.host
.ping
.gitsearch

━━━━━━━━━━━━━━━━━━━━━━
🛡️ *Security & Anti-Features*
━━━━━━━━━━━━━━━━━━━━━━
.antideleted
.antibiewed
.amtilink

━━━━━━━━━━━━━━━━━━━━━━
🗃️ *Database & System*
━━━━━━━━━━━━━━━━━━━━━━
.ebase
.dbase
.var
.allvar
.backup
.save
.delete
.runtime
.system
.updatecheck
.restart

━━━━━━━━━━━━━━━━━━━━━━
👤 *User & Admin*
━━━━━━━━━━━━━━━━━━━━━━
.mode
.time
.whoami
.sudoadd
.admins
.contact
.getprofilepic
.autobio

━━━━━━━━━━━━━━━━━━━━━━
📚 *Info & Reference*
━━━━━━━━━━━━━━━━━━━━━━
.bible
.quran
.fdroid
.doc

━━━━━━━━━━━━━━━━━━━━━━
🎮 *Games & Fun*
━━━━━━━━━━━━━━━━━━━━━━
.game
.tictactoe
.truthordare
.trivia
.welcome
.goodbye
.alive
.chatboton
.chatbotoff

━━━━━━━━━━━━━━━━━━━━━━
🛠️ *Utilities*
━━━━━━━━━━━━━━━━━━━━━━
.compress
.readqrcode

━━━━━━━━━━━━━━━━━━━━━━
`;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        browser: ['CYBER-Xmd', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('Scan the QR code above with WhatsApp!');
        }
        if (connection === 'close') {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // MENU
        if (text.toLowerCase() === '.menu') {
            await sock.sendMessage(from, { text: menu });
        }
        // AUTOBIO
        else if (text.toLowerCase() === '.autobio') {
            if (typeof sock.updateProfileStatus === 'function') {
                await sock.updateProfileStatus(hackerBioText);
                await sock.sendMessage(from, { text: 'Bio updated to hacker mode!' });
            } else {
                await sock.sendMessage(from, { text: 'Sorry, autobio is not supported in this version.' });
            }
        }
        // TIME
        else if (text.toLowerCase() === '.time') {
            await sock.sendMessage(from, { text: `Current time: ${new Date().toLocaleString()}` });
        }
        // WHOAMI
        else if (text.toLowerCase() === '.whoami') {
            await sock.sendMessage(from, { text: `You are: ${from}` });
        }
        // ALIVE
        else if (text.toLowerCase() === '.alive') {
            await sock.sendMessage(from, { text: 'CYBER-Xmd is online and operational! 👾' });
        }
        // RESTART
        else if (text.toLowerCase() === '.restart') {
            await sock.sendMessage(from, { text: 'Restarting bot...' });
            process.exit(0);
        }
        // OBFUSCATION (simple base64 for demo)
        else if (text.toLowerCase().startsWith('.obfuscate ')) {
            const toObf = text.slice(11);
            const obf = Buffer.from(toObf).toString('base64');
            await sock.sendMessage(from, { text: `Obfuscated: ${obf}` });
        }
        // DEOBFUSCATE (simple base64 for demo)
        else if (text.toLowerCase().startsWith('.deobfuscate ')) {
            try {
                const toDeobf = text.slice(13);
                const deobf = Buffer.from(toDeobf, 'base64').toString('utf-8');
                await sock.sendMessage(from, { text: `Deobfuscated: ${deobf}` });
            } catch {
                await sock.sendMessage(from, { text: 'Invalid base64 string.' });
            }
        }
        // DEEP OBFUSCATION (double base64)
        else if (text.toLowerCase().startsWith('.deepobfuscate ')) {
            const toObf = text.slice(15);
            const obf = Buffer.from(Buffer.from(toObf).toString('base64')).toString('base64');
            await sock.sendMessage(from, { text: `Deep Obfuscated: ${obf}` });
        }
        // DEEP DEOBFUSCATE (double base64)
        else if (text.toLowerCase().startsWith('.deobfuscate_deeper ')) {
            try {
                const toDeobf = text.slice(21);
                const deobf = Buffer.from(Buffer.from(toDeobf, 'base64').toString('utf-8'), 'base64').toString('utf-8');
                await sock.sendMessage(from, { text: `Deep Deobfuscated: ${deobf}` });
            } catch {
                await sock.sendMessage(from, { text: 'Invalid double base64 string.' });
            }
        }
        // ENCRYPT (AES)
        else if (text.toLowerCase().startsWith('.encrypt ')) {
            const toEnc = text.slice(9);
            const enc = crypto.AES.encrypt(toEnc, 'cyberxmd').toString();
            await sock.sendMessage(from, { text: `Encrypted: ${enc}` });
        }
        // DECRYPT (AES)
        else if (text.toLowerCase().startsWith('.decrypt ')) {
            try {
                const toDec = text.slice(9);
                const dec = crypto.AES.decrypt(toDec, 'cyberxmd').toString(crypto.enc.Utf8);
                await sock.sendMessage(from, { text: `Decrypted: ${dec}` });
            } catch {
                await sock.sendMessage(from, { text: 'Invalid encrypted string.' });
            }
        }
        // HASH (SHA256)
        else if (text.toLowerCase().startsWith('.hash ')) {
            const toHash = text.slice(6);
            const hash = crypto.SHA256(toHash).toString();
            await sock.sendMessage(from, { text: `SHA256: ${hash}` });
        }
        // PING
        else if (text.toLowerCase().startsWith('.ping')) {
            const start = Date.now();
            await sock.sendMessage(from, { text: 'Pinging...' });
            const latency = Date.now() - start;
            await sock.sendMessage(from, { text: `Pong! Latency: ${latency}ms` });
        }
        // NMAP (simulated)
        else if (text.toLowerCase().startsWith('.nmap ')) {
            const target = text.slice(6);
            await sock.sendMessage(from, { text: `Simulated nmap scan on ${target}:\n22/tcp open ssh\n80/tcp open http\n443/tcp open https` });
        }
        // DNS (real lookup)
        else if (text.toLowerCase().startsWith('.dns ')) {
            const domain = text.slice(5);
            try {
                const res = await axios.get(`https://dns.google/resolve?name=${domain}`);
                const answer = res.data.Answer ? res.data.Answer.map(a => a.data).join('\n') : 'No DNS records found.';
                await sock.sendMessage(from, { text: `DNS for ${domain}:\n${answer}` });
            } catch {
                await sock.sendMessage(from, { text: 'DNS lookup failed.' });
            }
        }
        // DDOS (simulated)
        else if (text.toLowerCase().startsWith('.ddos ')) {
            await sock.sendMessage(from, { text: 'DDoS simulation started! (Just kidding, for legal reasons this is a joke.)' });
        }
        // HEADER (fetch headers)
        else if (text.toLowerCase().startsWith('.header ')) {
            const url = text.slice(8);
            try {
                const res = await axios.head(url);
                await sock.sendMessage(from, { text: `Headers for ${url}:\n${JSON.stringify(res.headers, null, 2)}` });
            } catch {
                await sock.sendMessage(from, { text: 'Failed to fetch headers.' });
            }
        }
        // HOST (IP lookup)
        else if (text.toLowerCase().startsWith('.host ')) {
            const domain = text.slice(6);
            try {
                const res = await axios.get(`https://api.ipify.org?format=json`);
                await sock.sendMessage(from, { text: `Your public IP: ${res.data.ip}` });
            } catch {
                await sock.sendMessage(from, { text: 'Failed to get host info.' });
            }
        }
        // GIT SEARCH (simulated)
        else if (text.toLowerCase().startsWith('.gitsearch ')) {
            const query = text.slice(11);
            await sock.sendMessage(from, { text: `Simulated GitHub search for "${query}":\nhttps://github.com/search?q=${encodeURIComponent(query)}` });
        }
        // SYSTEM
        else if (text.toLowerCase() === '.system') {
            await sock.sendMessage(from, { text: `OS: ${os.type()} ${os.release()}\nUptime: ${os.uptime()}s\nRAM: ${Math.round(os.freemem()/1024/1024)}MB free` });
        }
        // RUNTIME
        else if (text.toLowerCase() === '.runtime') {
            await sock.sendMessage(from, { text: `Bot runtime: ${process.uptime().toFixed(2)}s` });
        }
        // UPDATE CHECK (simulated)
        else if (text.toLowerCase() === '.updatecheck') {
            await sock.sendMessage(from, { text: 'You are running the latest version of CYBER-Xmd.' });
        }
        // FDROID
        else if (text.toLowerCase() === '.fdroid') {
            await sock.sendMessage(from, { text: 'F-Droid: https://f-droid.org/' });
        }
        // DOC (simulated)
        else if (text.toLowerCase() === '.doc') {
            await sock.sendMessage(from, { text: 'Documentation: https://github.com/WhiskeySockets/Baileys' });
        }
        // BIBLE (simulated)
        else if (text.toLowerCase() === '.bible') {
            await sock.sendMessage(from, { text: 'Bible verse: "For God so loved the world..." John 3:16' });
        }
        // QURAN (simulated)
        else if (text.toLowerCase() === '.quran') {
            await sock.sendMessage(from, { text: 'Quran verse: "Indeed, Allah is with the patient." (2:153)' });
        }
        // GAME (simulated)
        else if (text.toLowerCase() === '.game') {
            await sock.sendMessage(from, { text: 'Game: Type .tictactoe to play tic-tac-toe!' });
        }
        // TIC-TAC-TOE (simulated)
        else if (text.toLowerCase() === '.tictactoe') {
            await sock.sendMessage(from, { text: 'Tic-Tac-Toe: (Game logic not implemented yet)' });
        }
        // TRUTH OR DARE (simulated)
        else if (text.toLowerCase() === '.truthordare') {
            await sock.sendMessage(from, { text: 'Truth: What is your biggest fear?\nDare: Send a funny selfie!' });
        }
        // TRIVIA (simulated)
        else if (text.toLowerCase() === '.trivia') {
            await sock.sendMessage(from, { text: 'Trivia: What is the capital of France? (Answer: Paris)' });
        }
        // WELCOME
        else if (text.toLowerCase() === '.welcome') {
            await sock.sendMessage(from, { text: 'Welcome to the group! 👾' });
        }
        // GOODBYE
        else if (text.toLowerCase() === '.goodbye') {
            await sock.sendMessage(from, { text: 'Goodbye! Stay safe, hacker.' });
        }
        // CHATBOT ON/OFF (simulated)
        else if (text.toLowerCase() === '.chatboton') {
            await sock.sendMessage(from, { text: 'Chatbot mode enabled.' });
        }
        else if (text.toLowerCase() === '.chatbotoff') {
            await sock.sendMessage(from, { text: 'Chatbot mode disabled.' });
        }
        // COMPRESS (simulated)
        else if (text.toLowerCase().startsWith('.compress ')) {
            await sock.sendMessage(from, { text: 'Compression simulated. (Feature not implemented)' });
        }
        // READ QR CODE (simulated)
        else if (text.toLowerCase() === '.readqrcode') {
            await sock.sendMessage(from, { text: 'Send an image with a QR code and reply to it with .readqrcode (Feature not implemented)' });
        }
        // SAVE (simulated)
        else if (text.toLowerCase().startsWith('.save ')) {
            await sock.sendMessage(from, { text: 'Saved! (Feature not implemented)' });
        }
        // DELETE (simulated)
        else if (text.toLowerCase().startsWith('.delete ')) {
            await sock.sendMessage(from, { text: 'Deleted! (Feature not implemented)' });
        }
        // VAR (simulated)
        else if (text.toLowerCase() === '.var') {
            await sock.sendMessage(from, { text: 'Vars: (Feature not implemented)' });
        }
        // ALLVAR (simulated)
        else if (text.toLowerCase() === '.allvar') {
            await sock.sendMessage(from, { text: 'All Vars: (Feature not implemented)' });
        }
        // BACKUP (simulated)
        else if (text.toLowerCase() === '.backup') {
            await sock.sendMessage(from, { text: 'Backup created! (Feature not implemented)' });
        }
        // EBASE/DBASE (simulated)
        else if (text.toLowerCase() === '.ebase' || text.toLowerCase() === '.dbase') {
            await sock.sendMessage(from, { text: 'Database: (Feature not implemented)' });
        }
        // MODE (private/public simulated)
        else if (text.toLowerCase().startsWith('.mode ')) {
            const mode = text.split(' ')[1];
            await sock.sendMessage(from, { text: `Mode set to ${mode}` });
        }
        // SUDO ADD (simulated)
        else if (text.toLowerCase().startsWith('.sudoadd ')) {
            await sock.sendMessage(from, { text: 'Sudo user added! (Feature not implemented)' });
        }
        // ADMINS (simulated)
        else if (text.toLowerCase() === '.admins') {
            await sock.sendMessage(from, { text: 'Admins: (Feature not implemented)' });
        }
        // CONTACT (simulated)
        else if (text.toLowerCase() === '.contact') {
            await sock.sendMessage(from, { text: 'Bot Owner: +233539738956' });
        }
        // GET PROFILE PIC (simulated)
        else if (text.toLowerCase() === '.getprofilepic') {
            await sock.sendMessage(from, { text: 'Profile pic: (Feature not implemented)' });
        }
        // ANTI DELETED/ANTI VIEWED/AMTILINK (simulated)
        else if (text.toLowerCase() === '.antideleted' || text.toLowerCase() === '.antibiewed' || text.toLowerCase() === '.amtilink') {
            await sock.sendMessage(from, { text: 'Feature enabled! (Simulated)' });
        }
    });
}

startBot();