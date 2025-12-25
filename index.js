#!/usr/bin/env node

/**
 * 🚀 CANNOH MD - Heroku Deployment Version
 * Advanced WhatsApp Bot with Session Management
 * 
 * Features:
 * - Heroku-ready with PORT binding
 * - Session ID and phone number support
 * - Auto-reconnection
 * - Web dashboard with QR
 * - Session backup/restore
 * - Health monitoring
 */

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

// Import handlers
const MessageHandler = require('./handlers/messageHandler');
const FeatureHandler = require('./handlers/featureHandler');
const CommandHandler = require('./handlers/commandHandler');
const AIHandler = require('./handlers/aiHandler');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.qrCode = null;
        this.sessionId = process.env.SESSION_ID || 'cannoh-md-session';
        this.authFolder = `./sessions/${this.sessionId}`;
        this.config = this.loadConfig();
        
        // Heroku-specific settings
        this.herokuApiKey = process.env.HEROKU_API_KEY;
        this.herokuAppName = process.env.HEROKU_APP_NAME;
        
        // Initialize with default mode and prefix
        this.currentMode = this.config.defaultMode;
        this.currentPrefix = this.config.defaultPrefix;
        this.approvedUsers = new Set();
        this.userPrefixes = new Map();
        
        // Session management
        this.sessionData = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        
        // Initialize handlers
        this.messageHandler = new MessageHandler(this);
        this.featureHandler = new FeatureHandler(this);
        this.commandHandler = new CommandHandler(this);
        this.aiHandler = new AIHandler(this);
        
        // Create necessary directories
        this.ensureDirectories();
        
        // Load saved settings
        this.loadBotSettings();
    }

    loadConfig() {
        return {
            // Bot owner phone number (required for Heroku)
            owner: process.env.OWNER_NUMBER || process.env.PHONE_NUMBER || '919876543210',
            
            // Heroku deployment settings
            deployment: {
                platform: 'heroku',
                dynoType: process.env.DYNO || 'free',
                region: process.env.REGION || 'us',
                webUrl: process.env.HEROKU_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
            },
            
            // Bot settings from environment
            defaultPrefix: process.env.PREFIX || '!',
            defaultMode: process.env.MODE || 'public',
            botName: process.env.BOT_NAME || 'Cannoh MD',
            sessionId: process.env.SESSION_ID || 'heroku-session',
            
            // API Keys (set these in Heroku Config Vars)
            openaiApiKey: process.env.OPENAI_API_KEY,
            ytApiKey: process.env.YOUTUBE_API_KEY,
            
            // Feature Toggles (all enabled by default)
            features: {
                autoViewStatus: true,
                antiDelete: true,
                downloadMedia: true,
                viewOnceDownload: true,
                fakeRecording: true,
                alwaysOnline: true,
                fakeTyping: true,
                autoLikeStatus: true,
                aiFeatures: process.env.OPENAI_API_KEY ? true : false,
                chatGPT: process.env.OPENAI_API_KEY ? true : false,
                statusDownloader: true,
                antiCall: true,
                smartChatbot: true,
                autoBioUpdate: true,
                autoReact: true,
                autoRead: true,
                autoSaveContacts: true,
                antiBan: true,
                banSafeMode: true,
                prefixCustomization: true,
                modeSwitch: true,
                typingDetection: true,
                typingNotification: true,
                typingAnalytics: true
            },
            
            // Heroku-specific optimizations
            herokuOptimizations: {
                useWebsocket: true,
                compressSession: true,
                enableCaching: true,
                memoryLimit: 512, // MB
                autoRestart: true,
                backupSession: true
            },
            
            // Mode settings
            modeSettings: {
                public: {
                    allowedCommands: 'all',
                    allowedUsers: 'all',
                    requireApproval: false
                },
                private: {
                    allowedCommands: ['help', 'ping', 'ai', 'gpt', 'menu'],
                    allowedUsers: ['owner'],
                    requireApproval: true,
                    approvalList: []
                }
            },
            
            // Typing detection
            typingDetection: {
                enabled: true,
                notifyOwner: true,
                notifyGroup: false,
                saveLogs: true,
                trackPatterns: true,
                cooldown: 30000,
                ignoreBots: true,
                monitoredUsers: [],
                ignoredUsers: [],
                blacklistWords: [],
                typingSpeedAnalysis: true
            },
            
            // Auto-reaction
            autoReact: {
                enabled: true,
                reactions: ['❤️', '🔥', '😂', '😮', '😢', '👍'],
                probability: 0.3
            },
            
            // AI Settings
            ai: {
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 500
            },
            
            // Anti-ban protection
            antiBan: {
                maxMessagesPerMinute: 30,
                delayBetweenMessages: 1000,
                randomDelay: true
            },
            
            // Notifications
            notifications: {
                privateChat: true,
                groups: false,
                mentionUser: true,
                includeDuration: true,
                sendScreenshot: false,
                soundAlert: false
            }
        };
    }

    ensureDirectories() {
        const directories = [
            './sessions',
            this.authFolder,
            './storage',
            './downloads',
            './output',
            './assets',
            './logs',
            './backups'
        ];
        
        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.ensureDirSync(dir);
                console.log(`✅ Created directory: ${dir}`);
            }
        });
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Cannoh MD Bot on Heroku...');
            console.log(`📱 Owner: ${this.config.owner}`);
            console.log(`🌐 Web URL: ${this.config.deployment.webUrl}`);
            console.log(`🆔 Session ID: ${this.sessionId}`);
            
            // Check if session exists
            if (await this.checkExistingSession()) {
                console.log('✅ Found existing session, attempting to restore...');
                await this.restoreSession();
            } else {
                console.log('📱 No existing session found. New login required.');
            }
            
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: true,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                },
                browser: Browsers.macOS('Chrome'),
                markOnlineOnConnect: this.config.features.alwaysOnline,
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                retryRequestDelayMs: 2000,
                maxMsgRetryCount: 3,
                defaultQueryTimeoutMs: 60000,
                fireInitQueries: true,
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 10000,
                // Heroku optimizations
                emitOwnEvents: true,
                mobile: false,
                keepAliveReqInterval: 30000
            });

            // Save credentials
            this.sock.ev.on('creds.update', saveCreds);
            
            // Backup session periodically
            this.sock.ev.on('creds.update', async () => {
                await this.backupSession();
            });

            // Handle connection events
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.qrCode = qr;
                    require('qrcode-terminal').generate(qr, { small: true });
                    console.log('📱 New QR Code generated. Scan with WhatsApp.');
                    
                    // Save QR to file for web dashboard
                    this.saveQRToFile(qr);
                }
                
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    console.log(`🔌 Connection closed: ${lastDisconnect?.error?.message || 'Unknown error'}`);
                    console.log(`🔄 Reconnecting: ${shouldReconnect ? 'Yes' : 'No'}`);
                    
                    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        setTimeout(() => this.initialize(), 5000);
                    } else if (shouldReconnect) {
                        console.log('❌ Max reconnection attempts reached. Please restart the bot.');
                    }
                } else if (connection === 'open') {
                    console.log('✅ Bot connected successfully!');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.showWelcomeMessage();
                    
                    // Start feature handlers
                    this.startFeatureHandlers();
                    
                    // Send connection notification to owner
                    this.sendConnectionNotification();
                    
                    // Start periodic health checks
                    this.startHealthChecks();
                }
            });

            // Handle messages
            this.sock.ev.on('messages.upsert', async (m) => {
                await this.messageHandler.handleMessage(m);
            });

            // Handle presence updates
            this.sock.ev.on('presence.update', async (update) => {
                if (this.config.features.autoViewStatus) {
                    this.featureHandler.handleStatusView(update);
                }
                if (this.config.features.typingDetection) {
                    await this.featureHandler.handleTypingUpdate(update);
                }
            });

            // Handle message deletions
            this.sock.ev.on('messages.delete', (deleteData) => {
                if (this.config.features.antiDelete) {
                    this.featureHandler.handleDeleteMessage(deleteData);
                }
            });

            // Handle calls
            this.sock.ev.on('call', async (call) => {
                if (this.config.features.antiCall) {
                    await this.featureHandler.handleCall(call);
                }
            });

            console.log('🤖 Bot initialization complete. Waiting for connection...');

        } catch (error) {
            console.error('❌ Initialization error:', error);
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`🔄 Retrying initialization (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                setTimeout(() => this.initialize(), 10000);
            }
        }
    }

    async checkExistingSession() {
        try {
            const credsFile = path.join(this.authFolder, 'creds.json');
            return await fs.pathExists(credsFile);
        } catch (error) {
            return false;
        }
    }

    async restoreSession() {
        try {
            // Check if we have a backup
            const backupFile = `./backups/${this.sessionId}_backup.json`;
            if (await fs.pathExists(backupFile)) {
                const backupData = await fs.readJson(backupFile);
                const sessionDir = this.authFolder;
                
                // Restore each file from backup
                for (const [filename, content] of Object.entries(backupData.files)) {
                    const filePath = path.join(sessionDir, filename);
                    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
                }
                
                console.log('✅ Session restored from backup');
                return true;
            }
        } catch (error) {
            console.error('Session restore error:', error);
        }
        return false;
    }

    async backupSession() {
        try {
            const sessionDir = this.authFolder;
            const backupDir = './backups';
            
            await fs.ensureDir(backupDir);
            
            const files = await fs.readdir(sessionDir);
            const backupData = {
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                files: {}
            };
            
            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                if (file.endsWith('.json')) {
                    const content = await fs.readJson(filePath);
                    backupData.files[file] = content;
                }
            }
            
            const backupFile = path.join(backupDir, `${this.sessionId}_backup_${Date.now()}.json`);
            await fs.writeJson(backupFile, backupData, { spaces: 2 });
            
            console.log('✅ Session backed up');
            return true;
        } catch (error) {
            console.error('Backup error:', error);
            return false;
        }
    }

    async saveQRToFile(qr) {
        try {
            const qrData = {
                qr,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId
            };
            
            await fs.writeJson('./storage/qr_data.json', qrData, { spaces: 2 });
        } catch (error) {
            console.error('QR save error:', error);
        }
    }

    sendConnectionNotification() {
        if (!this.config.owner) return;
        
        setTimeout(async () => {
            try {
                const ownerJid = this.config.owner.includes('@') 
                    ? this.config.owner 
                    : `${this.config.owner}@s.whatsapp.net`;
                
                const message = `✅ *Cannoh MD Bot Connected*\n\n` +
                               `🤖 *Bot Name:* ${this.config.botName}\n` +
                               `🌐 *Platform:* Heroku\n` +
                               `🆔 *Session ID:* ${this.sessionId}\n` +
                               `🔗 *Dashboard:* ${this.config.deployment.webUrl}\n` +
                               `⏰ *Connected:* ${new Date().toLocaleString()}\n\n` +
                               `📊 *Features Enabled:* ${Object.values(this.config.features).filter(Boolean).length}/22\n` +
                               `🚀 *Status:* Bot is now active and ready!\n\n` +
                               `Use *${this.currentPrefix}help* for commands\n` +
                               `Use *${this.currentPrefix}menu* for feature list`;
                
                await this.sock.sendMessage(ownerJid, { text: message });
            } catch (error) {
                console.error('Connection notification error:', error);
            }
        }, 5000);
    }

    startHealthChecks() {
        // Health check every 5 minutes
        setInterval(() => {
            this.checkBotHealth();
        }, 5 * 60 * 1000);
        
        // Session backup every hour
        setInterval(async () => {
            await this.backupSession();
        }, 60 * 60 * 1000);
        
        // Memory check every 10 minutes
        setInterval(() => {
            this.checkMemoryUsage();
        }, 10 * 60 * 1000);
    }

    checkBotHealth() {
        const health = {
            connected: this.isConnected,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
        };
        
        // Save health data
        fs.writeJson('./storage/health.json', health, { spaces: 2 }).catch(console.error);
        
        if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log('⚠️ Bot not connected. Attempting reconnection...');
            this.initialize();
        }
    }

    checkMemoryUsage() {
        const memory = process.memoryUsage();
        const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
        const totalMB = Math.round(memory.heapTotal / 1024 / 1024);
        
        if (usedMB > 400) { // Heroku free dyno has 512MB
            console.warn(`⚠️ High memory usage: ${usedMB}MB/${totalMB}MB`);
            
            // Try to free memory
            if (global.gc) {
                global.gc();
                console.log('🧹 Garbage collection triggered');
            }
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = `
╔══════════════════════════════════════════════════╗
║           🚀 CANNOH MD BOT - HEROKU EDITION      ║
╚══════════════════════════════════════════════════╝

📱 Owner: ${this.config.owner}
🌐 URL: ${this.config.deployment.webUrl}
🆔 Session: ${this.sessionId}
📛 Prefix: ${this.currentPrefix}
🔒 Mode: ${this.currentMode.toUpperCase()}

📊 Heroku Dyno: ${this.config.deployment.dynoType}
📍 Region: ${this.config.deployment.region}

🔥 FEATURES ENABLED (${Object.values(this.config.features).filter(Boolean).length}/22):
${Object.entries(this.config.features)
    .filter(([_, enabled]) => enabled)
    .slice(0, 10)
    .map(([feature]) => `✅ ${feature}`)
    .join('\n')}
${Object.values(this.config.features).filter(Boolean).length > 10 ? '... and more' : ''}

📝 Use ${this.currentPrefix}help for commands
🔧 Use ${this.currentPrefix}toggle <feature> to control features
🎨 Use ${this.currentPrefix}menu for beautiful menu

💡 Heroku Tips:
• Session will persist across restarts with backups
• Check logs: heroku logs --tail -a ${this.herokuAppName}
• Monitor: ${this.config.deployment.webUrl}/dashboard
• Backup your session regularly!

✅ Bot is ready and connected!
`;
        console.log(welcomeMessage);
    }

    async loadBotSettings() {
        try {
            const data = await fs.readJson('./storage/bot_settings.json');
            
            Object.assign(this.config.features, data.features || {});
            this.currentMode = data.mode || this.config.defaultMode;
            this.currentPrefix = data.prefix || this.config.defaultPrefix;
            
            if (data.approvedUsers) {
                this.approvedUsers = new Set(data.approvedUsers);
            }
            if (data.userPrefixes) {
                this.userPrefixes = new Map(data.userPrefixes);
            }
            
            console.log('✅ Bot settings loaded from storage');
            console.log(`📛 Current Prefix: ${this.currentPrefix}`);
            console.log(`🔒 Current Mode: ${this.currentMode}`);
            
        } catch (error) {
            console.log('ℹ️ No saved settings found, using defaults');
            await this.saveBotSettings();
        }
    }

    async saveBotSettings() {
        try {
            const settings = {
                features: this.config.features,
                mode: this.currentMode,
                prefix: this.currentPrefix,
                approvedUsers: Array.from(this.approvedUsers),
                userPrefixes: Array.from(this.userPrefixes.entries()),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeJson('./storage/bot_settings.json', settings, { spaces: 2 });
            console.log('✅ Bot settings saved');
        } catch (error) {
            console.error('Error saving bot settings:', error);
        }
    }

    startFeatureHandlers() {
        if (this.config.features.autoBioUpdate) {
            this.featureHandler.startAutoBioUpdate();
        }
        if (this.config.features.autoReact) {
            this.featureHandler.startAutoReact();
        }
        if (this.config.features.alwaysOnline) {
            this.featureHandler.keepOnline();
        }
        if (this.config.features.typingDetection) {
            console.log('👁️ Typing detection enabled');
        }
        console.log('🚀 Feature handlers started');
    }
}

// Initialize bot
const bot = new WhatsAppBot();
bot.initialize();

// Express server for Heroku
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// API Routes
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'Cannoh MD - Heroku Edition',
        version: '3.0.0',
        connected: bot.isConnected,
        sessionId: bot.sessionId,
        owner: bot.config.owner ? bot.config.owner.replace(/\d(?=\d{4})/g, '*') : 'Not set',
        features: Object.keys(bot.config.features).filter(k => bot.config.features[k]).length,
        totalFeatures: Object.keys(bot.config.features).length,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        deployment: bot.config.deployment,
        documentation: 'https://github.com/yourusername/cannoh-md-bot'
    });
});

// QR Code endpoint
app.get('/qr', (req, res) => {
    if (bot.qrCode) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cannoh MD - QR Code</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                        padding: 20px;
                    }
                    .container {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        max-width: 600px;
                        width: 90%;
                    }
                    .qr-container {
                        background: white;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                        display: inline-block;
                    }
                    pre {
                        font-family: 'Courier New', monospace;
                        font-size: 8px;
                        line-height: 1;
                        margin: 0;
                        color: black;
                    }
                    .status {
                        margin: 20px 0;
                        padding: 15px;
                        border-radius: 10px;
                        background: ${bot.isConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
                        border: 1px solid ${bot.isConnected ? '#4CAF50' : '#F44336'};
                    }
                    .instructions {
                        text-align: left;
                        background: rgba(0, 0, 0, 0.2);
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                    .btn {
                        background: white;
                        color: #667eea;
                        padding: 12px 30px;
                        border: none;
                        border-radius: 30px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                        margin: 10px;
                        transition: transform 0.2s;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .info-card {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 15px;
                        border-radius: 10px;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 Cannoh MD WhatsApp Bot</h1>
                    <h2>Heroku Deployment</h2>
                    
                    <div class="status">
                        <h3>Status: ${bot.isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}</h3>
                        ${bot.isConnected ? 
                            '<p>Bot is connected and running!</p>' : 
                            '<p>Scan QR code to connect</p>'
                        }
                    </div>
                    
                    ${!bot.isConnected ? `
                    <div class="qr-container">
                        <pre>${require('qrcode-terminal').generate(bot.qrCode, { small: true })}</pre>
                    </div>
                    ` : ''}
                    
                    <div class="info-grid">
                        <div class="info-card">
                            <strong>📱 Session ID:</strong><br>${bot.sessionId}
                        </div>
                        <div class="info-card">
                            <strong>👑 Owner:</strong><br>${bot.config.owner ? bot.config.owner.replace(/\d(?=\d{4})/g, '*') : 'Not set'}
                        </div>
                        <div class="info-card">
                            <strong>🚀 Features:</strong><br>${Object.values(bot.config.features).filter(Boolean).length}/22 active
                        </div>
                        <div class="info-card">
                            <strong>⏰ Uptime:</strong><br>${Math.floor(process.uptime() / 60)} minutes
                        </div>
                    </div>
                    
                    ${!bot.isConnected ? `
                    <div class="instructions">
                        <h3>📱 How to Connect:</h3>
                        <ol>
                            <li>Open WhatsApp on your phone</li>
                            <li>Go to Settings → Linked Devices</li>
                            <li>Tap on "Link a Device"</li>
                            <li>Scan the QR code above</li>
                            <li>Wait for connection confirmation</li>
                        </ol>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 30px;">
                        <a href="/dashboard" class="btn">📊 Dashboard</a>
                        <a href="/api/health" class="btn">❤️ Health Check</a>
                        <a href="/api/restart" class="btn" onclick="return confirm('Restart bot?')">🔄 Restart</a>
                    </div>
                </div>
                
                <script>
                    // Auto-refresh QR code every 30 seconds if not connected
                    if (!${bot.isConnected}) {
                        setTimeout(() => location.reload(), 30000);
                    }
                </script>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>🤖 Cannoh MD Bot</h1>
                <p>${bot.isConnected ? '✅ Bot is already connected!' : '⏳ Generating QR code...'}</p>
                <p><a href="/">Refresh page</a></p>
            </body>
            </html>
        `);
    }
});

// Dashboard
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cannoh MD - Dashboard</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                    color: white;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 20px;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                    margin-bottom: 40px;
                }
                .feature-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 15px;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                .btn {
                    background: white;
                    color: #667eea;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    text-decoration: none;
                    display: inline-block;
                    margin: 5px;
                    transition: transform 0.2s;
                
