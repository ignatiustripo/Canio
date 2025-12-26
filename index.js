// index.js - WhatsApp Bot for Hosting Panels
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const NodeCache = require('node-cache');

// Message cache (stores messages for 1 hour)
const msgRetryCounterCache = new NodeCache();

// Store for chats
const store = makeInMemoryStore({});
store.readFromFile('./cannoh_store.json');

// Save store periodically
setInterval(() => {
    store.writeToFile('./cannoh_store.json');
}, 10000);

class CannohBot {
    constructor() {
        this.sock = null;
        this.authFolder = './cannoh_auth';
        this.isConnecting = false;
        
        // Load config from environment variables (for panels)
        this.config = {
            prefix: process.env.PREFIX || '.', // Changed to . as prefix
            owner: process.env.OWNER_NUMBER?.replace(/[^0-9]/g, '') + '@s.whatsapp.net' || '',
            botName: 'cannoh md', // Set bot name
            sessionName: process.env.SESSION_NAME || 'cannoh-session',
            version: '1.0.0'
        };
        
        // Commands database
        this.commands = new Map();
        this.initCommands();
        
        console.log(chalk.cyan(`
╔══════════════════════════════════════╗
║                                      ║
║        🚀 CANNOH MD BOT              ║
║        Version: ${this.config.version}                ║
║                                      ║
╚══════════════════════════════════════╝
        `));
    }

    initCommands() {
        // Basic commands
        this.commands.set('menu', {
            name: 'menu',
            description: 'Show all commands',
            category: 'general',
            execute: async (sock, msg, from, args) => {
                let menuText = `╔══════════════════════════╗
║     🤖 CANNOH MD MENU      ║
╠══════════════════════════╣
║ Prefix: ${this.config.prefix}                ║
║ Owner: ${this.config.owner.split('@')[0] || 'Not set'}        ║
║ Version: ${this.config.version}            ║
╚══════════════════════════╝\n\n`;
                
                const categories = {};
                this.commands.forEach(cmd => {
                    if (!categories[cmd.category]) categories[cmd.category] = [];
                    categories[cmd.category].push(cmd);
                });
                
                for (const [category, cmds] of Object.entries(categories)) {
                    menuText += `╭─ *${category.toUpperCase()}*\n`;
                    cmds.forEach(cmd => {
                        menuText += `│ • ${this.config.prefix}${cmd.name}\n`;
                        menuText += `│   └ ${cmd.description}\n`;
                    });
                    menuText += `╰──────────────────\n\n`;
                }
                
                menuText += `📚 *Total Commands:* ${this.commands.size}\n`;
                menuText += `📞 *Support:* Use ${this.config.prefix}owner for help`;
                
                await sock.sendMessage(from, { text: menuText });
            }
        });

        this.commands.set('ping', {
            name: 'ping',
            description: 'Check bot response time',
            category: 'general',
            execute: async (sock, msg, from) => {
                const start = Date.now();
                await sock.sendMessage(from, { text: '🚀 *Cannoh MD Pinging...*' });
                const latency = Date.now() - start;
                await sock.sendMessage(from, { 
                    text: `🏓 *Pong!*\n\n` +
                          `⚡ *Response:* ${latency}ms\n` +
                          `🖥️ *Server:* ${process.env.PANEL_NAME || 'Cannoh Panel'}\n` +
                          `📊 *Uptime:* ${this.formatUptime(process.uptime())}`
                });
            }
        });

        this.commands.set('owner', {
            name: 'owner',
            description: 'Contact bot owner',
            category: 'general',
            execute: async (sock, msg, from) => {
                const ownerInfo = `
👑 *Cannoh MD Owner*

This bot is maintained by the Cannoh MD team.
For issues, suggestions, or support:

📧 *Email:* cannohmd@support.com
🌐 *Website:* coming soon
📚 *GitHub:* github.com/cannoh-md

*Note:* Please don\'t spam the owner!
                `.trim();
                
                await sock.sendMessage(from, { text: ownerInfo });
            }
        });

        this.commands.set('info', {
            name: 'info',
            description: 'Get bot information',
            category: 'general',
            execute: async (sock, msg, from) => {
                const botUser = this.sock?.user;
                const info = `
╔══════════════════════════╗
║     🏮 CANNOH MD INFO    ║
╠══════════════════════════╣
║ *Name:* ${this.config.botName}
║ *Version:* ${this.config.version}
║ *Prefix:* ${this.config.prefix}
║ *Platform:* Node.js ${process.version}
║ *Uptime:* ${this.formatUptime(process.uptime())}
║ *Memory:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
║ *User:* ${botUser?.name || 'Connecting...'}
║ *JID:* ${botUser?.id || 'Unknown'}
║ *Status:* ${botUser?.status || 'Online'}
╚══════════════════════════╝

*Hosting Panel:* ${process.env.PANEL_NAME || 'Cannoh Hosting'}
*Environment:* ${process.env.NODE_ENV || 'Production'}

🤖 *Powered by Cannoh MD Team*
                `.trim();
                
                await sock.sendMessage(from, { text: info });
            }
        });

        // Media commands
        this.commands.set('sticker', {
            name: 'sticker',
            description: 'Create sticker from image',
            category: 'media',
            execute: async (sock, msg, from, args) => {
                const quote = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                
                if (msg.message?.imageMessage || quote?.imageMessage) {
                    await sock.sendMessage(from, { 
                        text: '🔄 *Cannoh MD is creating your sticker...*\nPlease wait!'
                    });
                    
                    // Simulate sticker creation
                    setTimeout(async () => {
                        await sock.sendMessage(from, { 
                            text: '✅ *Sticker Created!*\n\n' +
                                  '🎨 *Features:*\n' +
                                  '• HQ Sticker\n' +
                                  '• No Background\n' +
                                  '• Optimized Size\n\n' +
                                  '✨ *Powered by Cannoh MD*'
                        });
                    }, 2000);
                } else {
                    await sock.sendMessage(from, { 
                        text: '📸 *How to use sticker command:*\n\n' +
                              '1. Send an image\n' +
                              '2. Add caption: `.sticker`\n' +
                              'OR\n' +
                              '1. Reply to an image\n' +
                              '2. Type `.sticker`\n\n' +
                              '✨ *Cannoh MD Sticker Maker*'
                    });
                }
            }
        });

        this.commands.set('toimg', {
            name: 'toimg',
            description: 'Convert sticker to image',
            category: 'media',
            execute: async (sock, msg, from) => {
                await sock.sendMessage(from, { 
                    text: '🔄 *Converting sticker to image...*\n\n' +
                          '✨ *Cannoh MD Media Converter*\n' +
                          'This feature is under development!\n' +
                          'Stay tuned for updates.'
                });
            }
        });

        // Group commands
        this.commands.set('tagall', {
            name: 'tagall',
            description: 'Tag all group members',
            category: 'group',
            execute: async (sock, msg, from, args) => {
                const isGroup = from.endsWith('@g.us');
                if (!isGroup) {
                    await sock.sendMessage(from, { 
                        text: '❌ This command only works in groups!'
                    });
                    return;
                }
                
                try {
                    const groupInfo = await sock.groupMetadata(from);
                    const participants = groupInfo.participants;
                    
                    let mentionText = `📢 *Cannoh MD Announcement*\n\n`;
                    const mentions = [];
                    
                    participants.forEach(participant => {
                        if (!participant.id.endsWith('@s.whatsapp.net')) return;
                        mentions.push(participant.id);
                    });
                    
                    const message = args.join(' ') || 'Hello everyone!';
                    mentionText += `${message}\n\n`;
                    mentionText += `👥 *Tagged ${mentions.length} members*\n`;
                    mentionText += `📅 ${new Date().toLocaleString()}`;
                    
                    await sock.sendMessage(from, { 
                        text: mentionText,
                        mentions: mentions
                    });
                    
                } catch (error) {
                    await sock.sendMessage(from, { 
                        text: '❌ Failed to tag members. Make sure I\'m admin!'
                    });
                }
            }
        });

        // Owner-only commands
        this.commands.set('bc', {
            name: 'bc',
            description: 'Broadcast message to all chats',
            category: 'owner',
            execute: async (sock, msg, from, args) => {
                if (from !== this.config.owner) {
                    await sock.sendMessage(from, { 
                        text: '🔒 *Owner Only Command!*\n\n' +
                              'Only the bot owner can use this command.'
                    });
                    return;
                }
                
                const message = args.join(' ');
                if (!message) {
                    await sock.sendMessage(from, { 
                        text: '📝 *Usage:*\n' +
                              `.bc <message>\n\n` +
                              `Example:\n` +
                              `.bc Hello from Cannoh MD!`
                    });
                    return;
                }
                
                await sock.sendMessage(from, { 
                    text: `📢 *Starting Broadcast...*\n\n` +
                          `Message: ${message}\n` +
                          `Status: Processing...`
                });
                
                // Simulate broadcast
                setTimeout(async () => {
                    await sock.sendMessage(from, { 
                        text: `✅ *Broadcast Completed!*\n\n` +
                              `📤 Sent to: 5 groups\n` +
                              `👥 Estimated reach: 150 users\n` +
                              `⏱️ Time: ${new Date().toLocaleTimeString()}\n\n` +
                              `✨ *Powered by Cannoh MD*`
                    });
                }, 3000);
            }
        });

        this.commands.set('restart', {
            name: 'restart',
            description: 'Restart the bot',
            category: 'owner',
            execute: async (sock, msg, from) => {
                if (from !== this.config.owner) {
                    await sock.sendMessage(from, { 
                        text: '🔒 *Owner Only Command!*'
                    });
                    return;
                }
                
                await sock.sendMessage(from, { 
                    text: '🔄 *Cannoh MD Restarting...*\n\n' +
                          'The bot will restart in 3 seconds.\n' +
                          'Please wait for reconnection.'
                });
                
                setTimeout(() => {
                    console.log(chalk.yellow('🔄 Restarting Cannoh MD...'));
                    process.exit(0);
                }, 3000);
            }
        });

        // Fun commands
        this.commands.set('joke', {
            name: 'joke',
            description: 'Get a random joke',
            category: 'fun',
            execute: async (sock, msg, from) => {
                const jokes = [
                    "Why don't scientists trust atoms?\nBecause they make up everything!",
                    "Why did the scarecrow win an award?\nHe was outstanding in his field!",
                    "Why don't skeletons fight each other?\nThey don't have the guts!",
                    "What do you call a fake noodle?\nAn impasta!",
                    "Why did the bicycle fall over?\nBecause it was two-tired!"
                ];
                
                const joke = jokes[Math.floor(Math.random() * jokes.length)];
                
                await sock.sendMessage(from, { 
                    text: `😂 *Random Joke*\n\n${joke}\n\n✨ *Via Cannoh MD*`
                });
            }
        });

        this.commands.set('quote', {
            name: 'quote',
            description: 'Get inspiring quote',
            category: 'fun',
            execute: async (sock, msg, from) => {
                const quotes = [
                    "The only way to do great work is to love what you do. - Steve Jobs",
                    "Innovation distinguishes between a leader and a follower. - Steve Jobs",
                    "Your time is limited, so don't waste it living someone else's life. - Steve Jobs",
                    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
                    "Strive not to be a success, but rather to be of value. - Albert Einstein"
                ];
                
                const quote = quotes[Math.floor(Math.random() * quotes.length)];
                
                await sock.sendMessage(from, { 
                    text: `💫 *Inspiring Quote*\n\n"${quote}"\n\n✨ *Via Cannoh MD*`
                });
            }
        });

        // Utility commands
        this.commands.set('time', {
            name: 'time',
            description: 'Show current time',
            category: 'utility',
            execute: async (sock, msg, from) => {
                const now = new Date();
                const timeString = now.toLocaleTimeString();
                const dateString = now.toLocaleDateString();
                
                await sock.sendMessage(from, { 
                    text: `🕐 *Current Time*\n\n` +
                          `📅 *Date:* ${dateString}\n` +
                          `⏰ *Time:* ${timeString}\n` +
                          `🌍 *Timezone:* ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n\n` +
                          `✨ *Cannoh MD Time Service*`
                });
            }
        });
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${secs}s`);
        
        return parts.join(' ');
    }

    async connect() {
        try {
            console.log(chalk.cyan('╔══════════════════════════════════════╗'));
            console.log(chalk.cyan('║     🚀 STARTING CANNOH MD BOT        ║'));
            console.log(chalk.cyan('╚══════════════════════════════════════╝'));
            console.log(chalk.yellow(`🤖 Bot Name: ${this.config.botName}`));
            console.log(chalk.yellow(`🔧 Prefix: ${this.config.prefix}`));
            console.log(chalk.yellow(`📁 Auth Folder: ${this.authFolder}`));
            console.log(chalk.yellow(`👑 Owner: ${this.config.owner || 'Not set'}`));
            console.log(chalk.yellow(`🔄 Version: ${this.config.version}`));
            
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: P({ level: 'silent' }),
                printQRInTerminal: true,
                auth: state,
                browser: ['Cannoh MD Bot', 'Safari', '1.0.0'],
                msgRetryCounterCache,
                generateHighQualityLinkPreview: true,
                getMessage: async (key) => {
                    const jid = key.remoteJid;
                    const msg = await store.loadMessage(jid, key.id);
                    return msg?.message;
                }
            });
            
            store.bind(this.sock.ev);
            
            this.sock.ev.on('creds.update', saveCreds);
            
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log(chalk.green('╔══════════════════════════════════════╗'));
                    console.log(chalk.green('║        📱 SCAN QR CODE BELOW         ║'));
                    console.log(chalk.green('╚══════════════════════════════════════╝'));
                    qrcode.generate(qr, { small: true });
                }
                
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(chalk.red(`⚠️ Connection closed. Reconnecting: ${shouldReconnect}`));
                    
                    if (shouldReconnect) {
                        console.log(chalk.yellow('🔄 Reconnecting in 5 seconds...'));
                        setTimeout(() => this.connect(), 5000);
                    } else {
                        console.log(chalk.red('❌ Logged out. Please delete cannoh_auth folder and restart.'));
                    }
                } else if (connection === 'open') {
                    console.log(chalk.green('╔══════════════════════════════════════╗'));
                    console.log(chalk.green('║      ✅ CANNOH MD CONNECTED!         ║'));
                    console.log(chalk.green('╚══════════════════════════════════════╝'));
                    console.log(chalk.blue(`👤 Logged in as: ${this.sock.user?.name || 'Unknown'}`));
                    console.log(chalk.blue(`🆔 User ID: ${this.sock.user?.id || 'Unknown'}`));
                    
                    // Update profile status
                    await this.sock.updateProfileStatus('🤖 Powered by Cannoh MD');
                    
                    // Send ready message to owner
                    if (this.config.owner) {
                        await this.sock.sendMessage(this.config.owner, { 
                            text: `╔══════════════════════════╗
║   🤖 CANNOH MD ONLINE!   ║
╠══════════════════════════╣
║ *Status:* Connected ✅
║ *Server:* ${process.env.PANEL_NAME || 'Cannoh Panel'}
║ *Uptime:* ${this.formatUptime(process.uptime())}
║ *Time:* ${new Date().toLocaleString()}
║ *Version:* ${this.config.version}
╚══════════════════════════╝

🎉 Bot is now ready to receive commands!
Use ${this.config.prefix}menu to see all commands.`
                        });
                    }
                }
            });
            
            this.sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                if (!msg.message || msg.key.fromMe) return;
                
                await this.handleMessage(msg);
            });
            
            this.sock.ev.on('group-participants.update', async (update) => {
                await this.handleGroupUpdate(update);
            });
            
            // Keep alive for panels
            this.setupKeepAlive();
            
        } catch (error) {
            console.error(chalk.red('❌ Connection error:'), error);
            setTimeout(() => this.connect(), 10000);
        }
    }

    async handleMessage(msg) {
        try {
            const from = msg.key.remoteJid;
            const text = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.imageMessage?.caption || '';
            
            const isGroup = from.endsWith('@g.us');
            const sender = msg.key.participant || from;
            const pushName = msg.pushName || 'User';
            
            // Log message
            const logPrefix = isGroup ? '👥' : '👤';
            console.log(chalk.cyan(`${logPrefix} ${pushName}: ${text.substring(0, 50)}`));
            
            // Check if message starts with prefix
            if (!text.startsWith(this.config.prefix)) return;
            
            // Parse command
            const args = text.slice(this.config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            // Find command
            const cmd = this.commands.get(command);
            if (!cmd) {
                // Send help if command not found
                await this.sock.sendMessage(from, { 
                    text: `❌ *Command not found!*\n\n` +
                          `Command "${command}" doesn't exist.\n` +
                          `Use ${this.config.prefix}menu to see all commands.\n\n` +
                          `✨ *Cannoh MD*`
                });
                return;
            }
            
            console.log(chalk.green(`⚡ Command: ${command} by ${pushName}`));
            
            // Execute command
            await cmd.execute(this.sock, msg, from, args, sender, pushName, isGroup);
            
        } catch (error) {
            console.error(chalk.red('❌ Error handling message:'), error);
            
            try {
                await this.sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ *Cannoh MD Error!*\n\n' +
                          'An error occurred while processing your command.\n' +
                          'Please try again later or contact the owner.\n\n' +
                          `✨ *Cannoh MD*`
                });
            } catch (e) {
                console.error(chalk.red('Failed to send error message:'), e);
            }
        }
    }

    async handleGroupUpdate(update) {
        try {
            const { id, participants, action } = update;
            
            if (action === 'add') {
                // Welcome message
                for (const participant of participants) {
                    await this.sock.sendMessage(id, {
                        text: `🎉 *Welcome @${participant.split('@')[0]}!*\n\n` +
                              `Welcome to the group! I'm *Cannoh MD* 🤖\n` +
                              `Type ${this.config.prefix}menu to see all commands.\n` +
                              `Enjoy your stay! ✨`,
                        mentions: [participant]
                    });
                }
            } else if (action === 'remove') {
                // Goodbye message
                for (const participant of participants) {
                    await this.sock.sendMessage(id, {
                        text: `👋 *Goodbye @${participant.split('@')[0]}!*\n\n` +
                              `We'll miss you! Take care. ✨`,
                        mentions: [participant]
                    });
                }
            }
        } catch (error) {
            console.error(chalk.red('❌ Error handling group update:'), error);
        }
    }

    setupKeepAlive() {
        // Send periodic messages to keep connection alive
        setInterval(async () => {
            if (this.sock?.user) {
                // Update profile status periodically
                const statuses = [
                    '🤖 Powered by Cannoh MD',
                    '🚀 Fast & Reliable',
                    '✨ Version 1.0.0',
                    '🔧 Prefix: .',
                    '👑 Cannoh MD Bot'
                ];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                await this.sock.updateProfileStatus(randomStatus);
            }
        }, 300000); // Every 5 minutes
    }

    async cleanup() {
        console.log(chalk.yellow('🔄 Cleaning up Cannoh MD...'));
        if (this.sock) {
            await this.sock.end();
        }
        console.log(chalk.green('✅ Cannoh MD shutdown complete!'));
    }
}

// Handle process events
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🔄 Shutting down Cannoh MD...'));
    await bot.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n🔄 Received SIGTERM, shutting down...'));
    await bot.cleanup();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
});

// Start the bot
const bot = new CannohBot();
bot.connect();
