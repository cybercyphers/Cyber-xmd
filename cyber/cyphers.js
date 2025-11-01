require('dotenv').config()
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs-extra')
const path = require('path')

// === Global Variables ===
const GLOBAL_OWNER = "cybercyphers";
const OWNER_PHONE = "+233539738956";
const TELEGRAM_USERNAME = "h4ck3r2008";

// === Bot Mode and User Management ===
let botMode = 'public';
let allowedUsers = new Set();

// === Load Config ===
function loadConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (!fs.existsSync(configPath)) {
        console.log('❌ config.json not found!');
        process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Set bot mode from config
    if (config.mode) {
        botMode = config.mode;
    }
    
    return config;
}

// === Utility functions ===
function validatePhoneNumber(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

function formatPhoneNumber(phone) {
    return phone.replace(/\D/g, '');
}

// === Load/Save Bot Settings ===
function loadBotSettings() {
    try {
        // Load bot mode from config
        const config = loadConfig();
        botMode = config.mode || 'public';

        // Load allowed users
        const usersFile = path.join(__dirname, '..', 'allowed_users.json');
        if (fs.existsSync(usersFile)) {
            const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            allowedUsers = new Set(users);
        } else {
            // Create empty users file
            fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
        }

        console.log(`🤖 Bot Mode: ${botMode}`);
        console.log(`👥 Allowed Users: ${allowedUsers.size}`);
    } catch (error) {
        console.log('❌ Error loading bot settings:', error.message);
    }
}

// === Phone Number Setup ===
function setupPhoneNumber() {
    const config = loadConfig();
    const phoneNumber = config.phone_number;
    
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
        console.log('❌ Invalid phone number in config.json!');
        console.log('Please update config.json with a valid phone number');
        process.exit(1);
    }
    
    console.log(`📱 Using phone number: ${phoneNumber}`);
    return formatPhoneNumber(phoneNumber);
}

// === Load Commands ===
const commands = new Map();
const commandsPath = path.join(__dirname, '..', 'commands');

function loadCommands() {
    try {
        if (!fs.existsSync(commandsPath)) {
            console.log('📁 Creating commands directory...');
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }

        const files = fs.readdirSync(commandsPath);
        files.forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const command = require(path.join(commandsPath, file));
                    commands.set(command.name, command);
                    console.log(`✅ Loaded command: ${command.name}`);
                } catch (error) {
                    console.log(`❌ Failed to load command ${file}:`, error.message);
                }
            }
        });
    } catch (error) {
        console.log('❌ Error loading commands:', error.message);
    }
}

// === Load Handlers ===
const handlers = new Map();
const handlersPath = path.join(__dirname, '..', 'handlers');

function loadHandlers() {
    try {
        if (!fs.existsSync(handlersPath)) {
            console.log('📁 Creating handlers directory...');
            fs.mkdirSync(handlersPath, { recursive: true });
            return;
        }

        const files = fs.readdirSync(handlersPath);
        files.forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const handler = require(path.join(handlersPath, file));
                    handlers.set(handler.name, handler);
                    console.log(`✅ Loaded handler: ${handler.name}`);
                } catch (error) {
                    console.log(`❌ Failed to load handler ${file}:`, error.message);
                }
            }
        });
    } catch (error) {
        console.log('❌ Error loading handlers:', error.message);
    }
}

// === Visit Creator Command (Embedded) ===
function setupVisitCreatorCommand() {
    commands.set('visitcreater', {
        name: 'visitcreater',
        description: 'Contact the bot creator',
        async execute(sock, msg, args) {
            const from = msg.key.remoteJid;
            const platform = args[0]?.toLowerCase();

            if (platform === '-whatsapp') {
                await sock.sendMessage(from, { 
                    text: `📱 *Contact Creator on WhatsApp*\n\nPhone: ${OWNER_PHONE}\n\n*Click the number to chat!*` 
                });
            } else if (platform === '-telegram') {
                await sock.sendMessage(from, { 
                    text: `📱 *Contact Creator on Telegram*\n\nUsername: @${TELEGRAM_USERNAME}\n\n*Search for this username on Telegram!*` 
                });
            } else {
                await sock.sendMessage(from, { 
                    text: `🤖 *Bot Creator Information*\n\n*Name:* ${GLOBAL_OWNER}\n*WhatsApp:* ${OWNER_PHONE}\n*Telegram:* @${TELEGRAM_USERNAME}\n\n*Use these commands:*\n• .visitcreater -whatsapp\n• .visitcreater -telegram` 
                });
            }
        }
    });
}

// === FIXED: Check if user is allowed (Private Mode) ===
function isUserAllowed(msg, state) {
    if (botMode === 'public') return true;
    
    const from = msg.key.remoteJid;
    
    // Extract user number from JID (remove @s.whatsapp.net)
    const userJid = msg.key.participant || from; // Use participant for group messages
    const userNumber = userJid.split('@')[0];
    
    // Extract bot owner number from credentials
    const botOwnerNumber = state.creds?.me?.id?.split(':')[0]?.split('@')[0];
    
    console.log(`🔐 Permission Check:`);
    console.log(`   User: ${userNumber}`);
    console.log(`   Bot Owner: ${botOwnerNumber}`);
    console.log(`   Allowed Users: ${Array.from(allowedUsers)}`);
    
    // Always allow the bot owner (connected number)
    if (userNumber === botOwnerNumber) {
        console.log(`✅ Allowed: Bot Owner`);
        return true;
    }
    
    // Check if user is in allowed users list
    if (allowedUsers.has(userNumber)) {
        console.log(`✅ Allowed: In Allowed Users List`);
        return true;
    }
    
    console.log(`❌ Denied: Not Authorized`);
    return false;
}

// === Enhanced Connection Handler ===
let reconnectAttempts = 0;
const maxReconnectAttempts = 20;

function handleConnection(sock, startBot, phoneNumber) {
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, isNewLogin, qr } = update;
        
        if (connection === 'open') {
            console.log('🎉 WhatsApp Bot Connected Successfully!');
            console.log(`📚 ${commands.size} commands loaded`);
            console.log(`🔧 ${handlers.size} handlers loaded`);
            console.log('🔔 Notifications will work normally');
            reconnectAttempts = 0; // Reset counter
            
            // CRITICAL FIX: Don't set any presence initially - this allows notifications
            console.log('✅ Notifications enabled - no presence interference');
        } 
        else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const error = lastDisconnect?.error;
            
            console.log(`❌ Connection closed. Status: ${statusCode}`);
            
            // Handle different status codes properly
            if (statusCode === 401) {
                console.log('🔄 Session expired. Attempting to generate new pairing code...');
                // Delete auth info and restart with pairing code
                setTimeout(() => {
                    console.log('🔄 Starting fresh session...');
                    startFreshSession(phoneNumber);
                }, 3000);
                return;
            }
            else if (statusCode === 403 || statusCode === 419) {
                console.log('❌ Authentication failed. Please restart bot.');
                process.exit(1);
            }
            
            reconnectAttempts++;
            const delay = Math.min(2000 + (reconnectAttempts * 1000), 15000); // 2-15 seconds
            
            console.log(`🔄 Reconnecting in ${delay/1000} seconds... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            if (reconnectAttempts <= maxReconnectAttempts) {
                setTimeout(() => {
                    console.log('🚀 Attempting to reconnect...');
                    startBot();
                }, delay);
            } else {
                console.log('❌ Max reconnection attempts reached. Restarting...');
                setTimeout(startBot, 5000);
            }
        }
        else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }
    });
}

// === Start Fresh Session (for 401 errors) ===
async function startFreshSession(phoneNumber) {
    try {
        console.log('🔄 Starting fresh session with new pairing code...');
        
        // Clear the auth info directory
        const authDir = './auth_info';
        if (fs.existsSync(authDir)) {
            fs.removeSync(authDir);
            console.log('✅ Cleared old authentication data');
        }
        
        // Restart the bot
        setTimeout(() => {
            console.log('🚀 Starting bot with fresh session...');
            process.exit(0); // Let the process manager restart it
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error starting fresh session:', error);
        process.exit(1);
    }
}

// === Execute Handlers ===
async function executeHandlers(sock, m, state) {
    for (const [name, handler] of handlers) {
        try {
            await handler.execute(sock, m, state, commands);
        } catch (error) {
            console.log(`❌ Handler ${name} error:`, error.message);
        }
    }
}

// === Main Bot ===
async function startBot() {
    try {
        // Step 1: Setup Phone Number (from config.json)
        const phoneNumber = setupPhoneNumber();

        // Step 2: Initialize WhatsApp with NOTIFICATION-FRIENDLY settings
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()

        let sock

        if (!state.creds?.me) {
            console.log(`🔄 Generating pairing code for: ${phoneNumber}`)
            sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: state,
                printQRInTerminal: false,
                // NOTIFICATION-FRIENDLY SETTINGS (CRITICAL)
                markOnlineOnConnect: false, // Don't show as online
                syncFullHistory: false, // Don't sync old messages
                linkPreviewImageThumbnailWidth: 0,
                generateHighQualityLinkPreview: false,
                // Don't send read receipts automatically
                emitOwnEvents: false,
                // Connection settings
                retryRequestDelayMs: 3000,
                maxRetries: 8,
                connectTimeoutMs: 45000,
                keepAliveIntervalMs: 25000,
                // Browser info
                browser: ['Ubuntu', 'Chrome', '122.0.0.0'],
                // Additional stability
                fireInitQueries: true,
                transactionOpts: { maxCommitRetries: 8, delayBetweenTriesMs: 2500 },
                mobile: false,
                // Better session handling
                shouldIgnoreJid: jid => jid.endsWith('@g.us')
            })

            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber)
                    console.log(`✅ Pairing Code: ${code}`)
                    console.log('👉 On phone: WhatsApp → Linked Devices → Link a Device → "Enter Code"')
                    console.log('💡 You have 60 seconds to enter the code')
                } catch (err) {
                    console.error('❌ Failed to get pairing code:', err.message)
                    setTimeout(() => {
                        console.log('🔄 Retrying pairing code in 10 seconds...')
                        startBot()
                    }, 10000)
                }
            }, 4000)
        } else {
            console.log('🔍 Checking session validity...');
            
            sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: state,
                // SAME NOTIFICATION-FRIENDLY SETTINGS
                markOnlineOnConnect: false,
                syncFullHistory: false,
                linkPreviewImageThumbnailWidth: 0,
                generateHighQualityLinkPreview: false,
                emitOwnEvents: false,
                retryRequestDelayMs: 3000,
                maxRetries: 8,
                connectTimeoutMs: 45000,
                keepAliveIntervalMs: 25000,
                browser: ['Ubuntu', 'Chrome', '122.0.0.0'],
                fireInitQueries: true,
                transactionOpts: { maxCommitRetries: 8, delayBetweenTriesMs: 2500 },
                mobile: false,
                shouldIgnoreJid: jid => jid.endsWith('@g.us')
            })
            console.log('✅ Logged in using saved session.')
        }

        // Step 3: Load Settings, Commands and Handlers
        loadBotSettings()
        loadCommands()
        loadHandlers()
        setupVisitCreatorCommand()
        console.log(`👑 Global Owner: ${GLOBAL_OWNER}`)

        // Step 4: Event Handlers
        sock.ev.on('creds.update', saveCreds)
        
        // Use enhanced connection handler with phoneNumber
        handleConnection(sock, startBot, phoneNumber)

        // Main message handler - executes all handlers
        sock.ev.on('messages.upsert', async m => {
            await executeHandlers(sock, m, state);
        })

    } catch (error) {
        console.error('❌ Error in startBot:', error.message);
        setTimeout(() => {
            console.log('🔄 Restarting bot after error...');
            startBot();
        }, 8000);
    }
}

// Start the bot
startBot()
