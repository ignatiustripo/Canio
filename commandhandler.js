const MenuGenerator = require('../utils/menuGenerator');
const { getCommandsData, getFeaturesData } = require('../utils/commandData');

class CommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.menuGenerator = new MenuGenerator("Cannoh MD");
        this.commands = new Map();
        this.adminCommands = new Set(['setprefix', 'setmode', 'approve', 'remove', 'userprefix', 'broadcast', 'eval']);
        this.initCommands();
    }

    initCommands() {
        // Feature toggle commands
        this.commands.set('toggle', this.toggleFeature.bind(this));
        
        // Download commands
        this.commands.set('song', this.downloadSong.bind(this));
        this.commands.set('video', this.downloadVideo.bind(this));
        this.commands.set('status', this.downloadStatus.bind(this));
        
        // AI commands
        this.commands.set('ai', this.handleAI.bind(this));
        this.commands.set('gpt', this.handleGPT.bind(this));
        
        // Utility commands
        this.commands.set('help', this.showHelp.bind(this));
        this.commands.set('features', this.showFeatures.bind(this));
        this.commands.set('ping', this.ping.bind(this));
        
        // Fake modes
        this.commands.set('record', this.fakeRecording.bind(this));
        this.commands.set('typing', this.fakeTyping.bind(this));
        
        // Mode & Prefix commands
        this.commands.set('setprefix', this.setPrefix.bind(this));
        this.commands.set('setmode', this.setMode.bind(this));
        this.commands.set('approve', this.approveUser.bind(this));
        this.commands.set('remove', this.removeUser.bind(this));
        this.commands.set('userprefix', this.setUserPrefix.bind(this));
        this.commands.set('mode', this.showMode.bind(this));
        this.commands.set('myprefix', this.showMyPrefix.bind(this));
        this.commands.set('approved', this.showApprovedUsers.bind(this));
        
        // Typing Detection Commands
        this.commands.set('typing', this.handleTypingCommands.bind(this));
        this.commands.set('typingstats', this.showTypingStats.bind(this));
        this.commands.set('whotyping', this.whoIsTyping.bind(this));
        this.commands.set('monitor', this.monitorUser.bind(this));
        this.commands.set('unmonitor', this.unmonitorUser.bind(this));
        this.commands.set('typinglog', this.showTypingLog.bind(this));
        this.commands.set('typingconfig', this.configTyping.bind(this));
        
        // Menu commands
        this.commands.set('menu', this.sendMenu.bind(this));
        this.commands.set('menugen', this.generateMenu.bind(this));
        this.commands.set('asciimenu', this.showAsciiMenu.bind(this));
        
        // Admin commands
        this.commands.set('broadcast', this.broadcast.bind(this));
        this.commands.set('eval', this.evalCode.bind(this));
    }

    async handleCommand(message, command, args) {
        const userJid = message.key.remoteJid;
        
        if (!this.bot.isUserAuthorized(userJid, command)) {
            if (this.bot.currentMode === 'private') {
                await this.bot.sock.sendMessage(userJid, {
                    text: '🔒 *BOT IS IN PRIVATE MODE*\n\n' +
                          'This bot is currently in private mode.\n' +
                          'Only approved users can use commands.\n\n' +
                          'Contact the owner for access:\n' +
                          `Owner: ${this.bot.config.owner.split('@')[0]}`
                });
            }
            return;
        }

        try {
            if (this.commands.has(command)) {
                await this.commands.get(command)(message, args);
            }
        } catch (error) {
            console.error('Command error:', error);
        }
    }

    async toggleFeature(message, args) {
        if (!args[0]) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !toggle <feature-name>\nExample: !toggle autoViewStatus'
            });
            return;
        }

        const feature = args[0];
        if (this.bot.config.features.hasOwnProperty(feature)) {
            this.bot.config.features[feature] = !this.bot.config.features[feature];
            this.bot.saveBotSettings();
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ ${feature} is now ${this.bot.config.features[feature] ? 'ENABLED' : 'DISABLED'}`
            });
        } else {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `❌ Feature "${feature}" not found`
            });
        }
    }

    async downloadSong(message, args) {
        if (!this.bot.config.features.downloadMedia) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Media download feature is disabled'
            });
            return;
        }

        const query = args.join(' ');
        if (!query) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !song <song name>'
            });
            return;
        }

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: '🔍 Searching for song...'
        });

        // Implement song download logic here
        // You can use ytdl-core or ytmp3 API
    }

    async showHelp(message) {
        const userPrefix = this.bot.getUserPrefix(message.key.remoteJid);
        
        const helpText = `
🎨 *CANNOH MD BOT - COMMAND MENU*

*🎯 QUICK START*
${userPrefix}menu - Show menu options
${userPrefix}help - This help message
${userPrefix}ping - Check bot status

*📱 MEDIA COMMANDS*
${userPrefix}song <name> - Download song
${userPrefix}video <url> - Download video
${userPrefix}status - Download status

*⚙️ SETTINGS*
${userPrefix}features - Show feature status
${userPrefix}toggle <feature> - Toggle features
${userPrefix}setprefix <prefix> - Change prefix (Owner)
${userPrefix}setmode <public/private> - Change mode (Owner)

*🤖 AI FEATURES*
${userPrefix}ai <prompt> - AI chat
${userPrefix}gpt <prompt> - ChatGPT

*⌨️ TYPING DETECTION*
${userPrefix}typing - Typing commands
${userPrefix}whotyping - Who is typing
${userPrefix}typingstats - Analytics

*🎭 FUN FEATURES*
${userPrefix}record - Fake recording
${userPrefix}typing - Fake typing

*👑 ADMIN COMMANDS*
${userPrefix}approve <number> - Approve user (Owner)
${userPrefix}remove <number> - Remove user (Owner)
${userPrefix}broadcast <msg> - Broadcast (Owner)

*📊 INFO*
${userPrefix}menu image - Generate menu image
${userPrefix}menu ascii - Show ASCII menu
${userPrefix}myprefix - Show your prefix

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot Name:* Cannoh MD
📛 *Your Prefix:* "${userPrefix}"
🔒 *Bot Mode:* ${this.bot.currentMode.toUpperCase()}
🚀 *Features:* ${Object.values(this.bot.config.features).filter(Boolean).length}/22 enabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Tip:* Use ${userPrefix}menu image for a beautiful visual menu!
    `;

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: helpText
        });
    }

    async showFeatures(message) {
        const featuresList = Object.entries(this.bot.config.features)
            .map(([feature, enabled]) => 
                `${enabled ? '✅' : '❌'} *${feature}*`
            )
            .join('\n');

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `🔧 *FEATURE STATUS*\n\n${featuresList}\n\nUse !toggle <feature> to change`
        });
    }

    async ping(message) {
        const start = Date.now();
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: '🏓 Pong!'
        });
        const latency = Date.now() - start;
        
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `⏱️ Latency: ${latency}ms\n🟢 Status: Connected\n💾 Features: ${Object.values(this.bot.config.features).filter(Boolean).length}/22 enabled`
        });
    }

    async fakeRecording(message) {
        if (!this.bot.config.features.fakeRecording) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Fake recording feature is disabled'
            });
            return;
        }

        await this.bot.sock.sendPresenceUpdate('recording', message.key.remoteJid);
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: '🎙️ Fake recording started! Use !stoprecord to stop'
        });
    }

    async fakeTyping(message) {
        if (!this.bot.config.features.fakeTyping) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Fake typing feature is disabled'
            });
            return;
        }

        await this.bot.sock.sendPresenceUpdate('composing', message.key.remoteJid);
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: '⌨️ Fake typing started! Will type for 30 seconds...'
        });

        setTimeout(() => {
            this.bot.sock.sendPresenceUpdate('paused', message.key.remoteJid);
        }, 30000);
    }

    async setPrefix(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const newPrefix = args[0];
        if (!newPrefix) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !setprefix <new_prefix>\nExample: !setprefix #'
            });
            return;
        }

        if (this.bot.setPrefix(newPrefix)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Global prefix changed to: "${newPrefix}"`
            });
        } else {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Prefix must be 1-3 characters long'
            });
        }
    }

    async setMode(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const mode = args[0]?.toLowerCase();
        if (!mode || !['public', 'private'].includes(mode)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !setmode <public/private>\nExample: !setmode private'
            });
            return;
        }

        if (this.bot.setMode(mode)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Bot mode changed to: *${mode.toUpperCase()}*\n\n` +
                      (mode === 'private' ? 
                       'Only approved users can use bot commands.\nUse !approve <number> to add users.' :
                       'All users can use bot commands.')
            });
        }
    }

    async approveUser(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const userInput = args[0];
        if (!userInput) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !approve <number>\nExample: !approve 919876543210'
            });
            return;
        }

        let userJid = userInput.includes('@') ? userInput : `${userInput}@s.whatsapp.net`;
        
        this.bot.approveUser(userJid);
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `✅ User approved: ${userJid}\nThey can now use bot commands in private mode.`
        });
    }

    async removeUser(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const userInput = args[0];
        if (!userInput) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !remove <number>\nExample: !remove 919876543210'
            });
            return;
        }

        let userJid = userInput.includes('@') ? userInput : `${userInput}@s.whatsapp.net`;
        
        this.bot.removeUser(userJid);
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `❌ User removed: ${userJid}\nThey can no longer use bot commands in private mode.`
        });
    }

    async setUserPrefix(message, args) {
        const newPrefix = args[0];
        if (!newPrefix) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !userprefix <new_prefix>\nExample: !userprefix &\nSet to "default" to use global prefix'
            });
            return;
        }

        if (newPrefix.toLowerCase() === 'default') {
            this.bot.userPrefixes.delete(message.key.remoteJid);
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '✅ Your custom prefix removed. Using global prefix.'
            });
            return;
        }

        if (this.bot.setUserPrefix(message.key.remoteJid, newPrefix)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Your personal prefix set to: "${newPrefix}"\nYour commands: ${newPrefix}help`
            });
        } else {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Prefix must be 1-3 characters long'
            });
        }
    }

    async showMode(message) {
        const modeInfo = this.bot.currentMode === 'private' ?
            `🔒 *PRIVATE MODE*\n` +
            `Only approved users can use commands\n` +
            `Approved users: ${this.bot.approvedUsers.size}\n` +
            `Owner: ${this.bot.config.owner.split('@')[0]}` :
            `🌍 *PUBLIC MODE*\n` +
            `All users can use commands\n` +
            `Anti-spam: ${this.bot.config.features.antiBan ? 'Enabled' : 'Disabled'}`;

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `🤖 *BOT MODE*\n\n${modeInfo}\n\n` +
                  `Prefix: "${this.bot.currentPrefix}"\n` +
                  `Your prefix: "${this.bot.getUserPrefix(message.key.remoteJid)}"`
        });
    }

    async showMyPrefix(message) {
        const userPrefix = this.bot.getUserPrefix(message.key.remoteJid);
        const isCustom = this.bot.userPrefixes.has(message.key.remoteJid);
        
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `📛 *YOUR PREFIX*\n\n` +
                  `Current prefix: "${userPrefix}"\n` +
                  `Type: ${isCustom ? 'Custom' : 'Global'}\n\n` +
                  `Example: ${userPrefix}help\n\n` +
                  `To change: ${userPrefix}userprefix <new_prefix>`
        });
    }

    async showApprovedUsers(message) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        if (this.bot.approvedUsers.size === 0) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '📋 No approved users yet.\nUse !approve <number> to add users.'
            });
            return;
        }

        const usersList = Array.from(this.bot.approvedUsers)
            .map(jid => `• ${jid.split('@')[0]}`)
            .join('\n');

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `📋 *APPROVED USERS* (${this.bot.approvedUsers.size})\n\n${usersList}\n\n` +
                  `Use !remove <number> to remove users.`
        });
    }

    async handleTypingCommands(message, args) {
        const subCommand = args[0]?.toLowerCase();
        const userPrefix = this.bot.getUserPrefix(message.key.remoteJid);
        
        if (!subCommand) {
            await this.showTypingHelp(message, userPrefix);
            return;
        }

        switch (subCommand) {
            case 'on':
            case 'off':
                await this.toggleTypingDetection(message, subCommand === 'on');
                break;
            case 'status':
                await this.showTypingStatus(message);
                break;
            case 'active':
                await this.whoIsTyping(message);
                break;
            case 'mystats':
                await this.showMyTypingStats(message);
                break;
            case 'clear':
                await this.clearTypingLogs(message);
                break;
            case 'export':
                await this.exportTypingData(message);
                break;
            default:
                await this.showTypingHelp(message, userPrefix);
        }
    }

    async toggleTypingDetection(message, enable) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        this.bot.config.features.typingDetection = enable;
        this.bot.saveBotSettings();
        
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `✅ Typing detection ${enable ? 'ENABLED' : 'DISABLED'}\n\n` +
                  `Notifications: ${this.bot.config.typingDetection.notifyOwner ? 'ON' : 'OFF'}\n` +
                  `Logging: ${this.bot.config.typingDetection.saveLogs ? 'ON' : 'OFF'}\n` +
                  `Analytics: ${this.bot.config.typingDetection.trackPatterns ? 'ON' : 'OFF'}`
        });
    }

    async showTypingStatus(message) {
        const stats = this.bot.featureHandler.getActiveTypingUsers();
        const activeCount = stats.length;
        
        const status = `👁️ *TYPING DETECTION STATUS*\n\n` +
                      `🔧 Feature: ${this.bot.config.features.typingDetection ? '✅ Enabled' : '❌ Disabled'}\n` +
                      `👥 Active Now: ${activeCount} user(s)\n` +
                      `📊 Total Tracked: ${this.bot.featureHandler.typingPatterns.size} users\n` +
                      `📝 Logs: ${this.bot.featureHandler.typingLogs.length} events\n` +
                      `🔔 Notifications: ${this.bot.config.typingDetection.notifyOwner ? 'ON' : 'OFF'}\n` +
                      `🛡️ Cooldown: ${this.bot.config.typingDetection.cooldown / 1000}s`;
        
        await this.bot.sock.sendMessage(message.key.remoteJid, { text: status });
    }

    async whoIsTyping(message) {
        const activeUsers = this.bot.featureHandler.getActiveTypingUsers();
        
        if (activeUsers.length === 0) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '🤫 No one is typing right now.'
            });
            return;
        }

        let response = `⌨️ *ACTIVE TYPERS* (${activeUsers.length})\n\n`;
        
        activeUsers.forEach((user, index) => {
            const duration = Math.floor(user.duration / 1000);
            response += `${index + 1}. *${user.userName}*\n`;
            response += `   📍 ${user.chatId.includes('@g.us') ? 'Group' : 'Private'}\n`;
            response += `   ⏱️ Typing for: ${duration}s\n`;
            response += `   📱 ${user.userId.split('@')[0]}\n\n`;
        });

        await this.bot.sock.sendMessage(message.key.remoteJid, { text: response });
    }

    async showTypingStats(message, args) {
        const targetUser = args[0] || message.key.remoteJid;
        
        if (!this.isOwner(message) && targetUser !== message.key.remoteJid) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ You can only view your own stats!'
            });
            return;
        }

        const stats = this.bot.featureHandler.getUserTypingStats(targetUser);
        if (!stats) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '📊 No typing data available for this user.'
            });
            return;
        }

        const userInfo = await this.bot.featureHandler.getUserInfo(targetUser);
        const userName = userInfo.name;
        
        const response = `📊 *TYPING ANALYTICS*\n\n` +
                        `👤 *User:* ${userName}\n\n` +
                        `📈 *Statistics*\n` +
                        `Total Sessions: ${stats.totalSessions}\n` +
                        `Total Duration: ${Math.floor(stats.totalDuration / 1000)}s\n` +
                        `Avg Duration: ${Math.floor(stats.averageDuration / 1000)}s\n` +
                        `Today: ${stats.sessionsToday} sessions\n\n` +
                        `🏆 *Patterns*\n` +
                        `Typing Speed: ${stats.typingSpeed} chars/min\n` +
                        `Confidence: ${stats.confidence}%\n` +
                        `Peak Hour: ${stats.peakHour}\n` +
                        `Last Typed: ${stats.lastTyping}`;
        
        await this.bot.sock.sendMessage(message.key.remoteJid, { text: response });
    }

    async showMyTypingStats(message) {
        const stats = this.bot.featureHandler.getUserTypingStats(message.key.remoteJid);
        if (!stats) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '📊 You haven\'t been tracked yet. Type something!'
            });
            return;
        }

        const response = `📊 *YOUR TYPING STATS*\n\n` +
                        `Total Sessions: ${stats.totalSessions}\n` +
                        `Typing Time: ${Math.floor(stats.totalDuration / 60000)} minutes\n` +
                        `Avg/Session: ${Math.floor(stats.averageDuration / 1000)}s\n` +
                        `Speed: ${stats.typingSpeed} chars/min\n` +
                        `Today: ${stats.sessionsToday} times\n` +
                        `Most Active: ${stats.peakHour}\n\n` +
                        `💡 *Tip:* You type ${stats.typingSpeed < 50 ? 'slowly' : stats.typingSpeed > 100 ? 'very fast' : 'at average speed'}.`;
        
        await this.bot.sock.sendMessage(message.key.remoteJid, { text: response });
    }

    async monitorUser(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const userInput = args[0];
        if (!userInput) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !monitor <number>\nAdds user to priority monitoring list.'
            });
            return;
        }

        const userJid = userInput.includes('@') ? userInput : `${userInput}@s.whatsapp.net`;
        
        if (!this.bot.config.typingDetection.monitoredUsers.includes(userJid)) {
            this.bot.config.typingDetection.monitoredUsers.push(userJid);
            this.bot.saveBotSettings();
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Added ${userJid} to monitoring list.\nYou'll get priority notifications when they type.`
            });
        } else {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '⚠️ User is already being monitored.'
            });
        }
    }

    async unmonitorUser(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const userInput = args[0];
        if (!userInput) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !unmonitor <number>\nRemoves user from monitoring list.'
            });
            return;
        }

        const userJid = userInput.includes('@') ? userInput : `${userInput}@s.whatsapp.net`;
        const index = this.bot.config.typingDetection.monitoredUsers.indexOf(userJid);
        
        if (index > -1) {
            this.bot.config.typingDetection.monitoredUsers.splice(index, 1);
            this.bot.saveBotSettings();
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Removed ${userJid} from monitoring list.`
            });
        } else {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '⚠️ User is not in monitoring list.'
            });
        }
    }

    async showTypingLog(message) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const recentLogs = this.bot.featureHandler.typingLogs.slice(-10).reverse();
        
        if (recentLogs.length === 0) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '📝 No typing logs available yet.'
            });
            return;
        }

        let logText = `📝 *RECENT TYPING LOGS* (${recentLogs.length})\n\n`;
        
        recentLogs.forEach((log, index) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const user = log.userName || log.userId.split('@')[0];
            const action = log.type === 'start' ? 'started typing' : 'stopped typing';
            const duration = log.duration ? ` for ${Math.floor(log.duration/1000)}s` : '';
            
            logText += `${index + 1}. ${time} - ${user} ${action}${duration}\n`;
        });

        await this.bot.sock.sendMessage(message.key.remoteJid, { text: logText });
    }

    async configTyping(message) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const config = this.bot.config.typingDetection;
        const settings = `
⚙️ *TYPING DETECTION CONFIG*\n
🔔 Notify Owner: ${config.notifyOwner ? '✅' : '❌'}
📝 Save Logs: ${config.saveLogs ? '✅' : '❌'}
📊 Track Patterns: ${config.trackPatterns ? '✅' : '❌'}
🤖 Ignore Bots: ${config.ignoreBots ? '✅' : '❌'}
⏰ Cooldown: ${config.cooldown / 1000} seconds
👥 Monitored Users: ${config.monitoredUsers.length}
🚫 Ignored Users: ${config.ignoredUsers.length}
`;

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: settings
        });
    }

    async clearTypingLogs(message) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        this.bot.featureHandler.typingLogs = [];
        this.bot.featureHandler.typingPatterns.clear();
        
        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: '✅ All typing logs and patterns cleared.'
        });
    }

    async exportTypingData(message) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const exportData = {
            timestamp: Date.now(),
            totalUsers: this.bot.featureHandler.typingPatterns.size,
            totalLogs: this.bot.featureHandler.typingLogs.length,
            patterns: Array.from(this.bot.featureHandler.typingPatterns.entries()),
            recentLogs: this.bot.featureHandler.typingLogs.slice(-100)
        };

        const fs = require('fs');
        const filename = `typing_export_${Date.now()}.json`;
        fs.writeFileSync(`./storage/${filename}`, JSON.stringify(exportData, null, 2));

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `📁 Typing data exported to: ${filename}\n` +
                  `Total users: ${exportData.totalUsers}\n` +
                  `Total logs: ${exportData.totalLogs}`
        });
    }

    async showTypingHelp(message, prefix) {
        const helpText = `
⌨️ *TYPING DETECTION COMMANDS*

${prefix}typing on/off - Enable/disable detection (Owner)
${prefix}typing status - Show detection status
${prefix}typing active - Show who's typing now
${prefix}typing mystats - Show your typing stats
${prefix}typing clear - Clear all logs (Owner)

${prefix}typingstats [user] - Show user typing analytics
${prefix}whotyping - List active typers
${prefix}typinglog - Show recent logs (Owner)
${prefix}typingconfig - Show configuration (Owner)

${prefix}monitor <number> - Add user to monitor list (Owner)
${prefix}unmonitor <number> - Remove from monitor list (Owner)

📊 *Features:*
• Real-time typing detection
• User analytics & patterns
• Priority monitoring
• Activity logs
• Speed analysis
• Peak hour detection
`;

        await this.bot.sock.sendMessage(message.key.remoteJid, { text: helpText });
    }

    async sendMenu(message, args) {
        try {
            const subCommand = args[0]?.toLowerCase();
            
            if (subCommand === 'image' || subCommand === 'gen') {
                await this.generateMenu(message);
                return;
            }
            
            if (subCommand === 'ascii' || subCommand === 'text') {
                await this.showAsciiMenu(message);
                return;
            }
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `🎨 *CANNOH MD MENU*\n\n` +
                      `Choose menu type:\n\n` +
                      `📷 *Image Menu* (High Quality)\n` +
                      `Usage: !menu image\n\n` +
                      `📝 *Text Menu* (Quick View)\n` +
                      `Usage: !menu ascii\n\n` +
                      `⚡ *Quick Help*\n` +
                      `Use !help for commands\n` +
                      `Use !features for status\n` +
                      `Use !ping for bot info`
            });
            
        } catch (error) {
            console.error('Menu command error:', error);
        }
    }

    async generateMenu(message) {
        try {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '🎨 Generating Cannoh MD menu image... Please wait ⏳'
            });
            
            const botInfo = {
                version: '3.0.0',
                prefix: this.bot.currentPrefix,
                mode: this.bot.currentMode,
                owner: this.bot.config.owner.split('@')[0],
                featureCount: Object.values(this.bot.config.features).filter(Boolean).length
            };
            
            const commands = getCommandsData(this.bot.currentPrefix);
            const features = getFeaturesData(this.bot.config.features);
            
            const result = await this.menuGenerator.generateMenuImage(features, commands);
            
            if (!result || !result.buffer) {
                throw new Error('Failed to generate menu');
            }
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                image: result.buffer,
                caption: `🎨 *CANNOH MD BOT MENU*\n\n` +
                        `🤖 *Bot Name:* Cannoh MD\n` +
                        `📛 *Prefix:* ${this.bot.currentPrefix}\n` +
                        `🔒 *Mode:* ${this.bot.currentMode.toUpperCase()}\n` +
                        `📊 *Features:* ${botInfo.featureCount}/22 enabled\n` +
                        `⚡ *Version:* 3.0.0\n\n` +
                        `✨ *Features Include:*\n` +
                        `• Auto View Status 👀\n` +
                        `• Anti-Delete Messages 🛡️\n` +
                        `• AI Smart Features 🤖\n` +
                        `• Media Download 📥\n` +
                        `• Typing Detection ⌨️\n\n` +
                        `📝 *Quick Commands:*\n` +
                        `${this.bot.currentPrefix}help - All commands\n` +
                        `${this.bot.currentPrefix}features - Feature status\n` +
                        `${this.bot.currentPrefix}toggle <feature> - Toggle features\n\n` +
                        `Generated: ${new Date().toLocaleString()}\n` +
                        `Made with ❤️ by Cannoh MD Team`
            });
            
            console.log(`✅ Menu image sent to ${message.key.remoteJid}`);
            
        } catch (error) {
            console.error('Menu generation error:', error);
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Failed to generate menu image. Using text menu instead.\n\n' +
                      await this.getTextMenu()
            });
        }
    }

    async showAsciiMenu(message) {
        try {
            const botInfo = {
                version: '3.0.0',
                prefix: this.bot.currentPrefix,
                mode: this.bot.currentMode,
                owner: this.bot.config.owner.split('@')[0],
                featureCount: Object.values(this.bot.config.features).filter(Boolean).length
            };
            
            const asciiMenu = await this.menuGenerator.generateAsciiArtMenu(botInfo);
            
            const chunks = this.splitMessage(asciiMenu, 2000);
            
            for (const chunk of chunks) {
                await this.bot.sock.sendMessage(message.key.remoteJid, {
                    text: chunk
                });
            }
            
        } catch (error) {
            console.error('ASCII menu error:', error);
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: await this.getTextMenu()
            });
        }
    }

    async getTextMenu() {
        const enabledFeatures = Object.entries(this.bot.config.features)
            .filter(([_, enabled]) => enabled)
            .map(([feature]) => feature)
            .join(', ');
            
        return `🎯 *CANNOH MD BOT*\n\n` +
               `📛 Prefix: ${this.bot.currentPrefix}\n` +
               `🔒 Mode: ${this.bot.currentMode}\n` +
               `🚀 Features: ${Object.values(this.bot.config.features).filter(Boolean).length}/22\n\n` +
               `✨ *Active Features:*\n${enabledFeatures}\n\n` +
               `💡 *Quick Start:*\n` +
               `1. Use ${this.bot.currentPrefix}help for commands\n` +
               `2. Use ${this.bot.currentPrefix}toggle to control features\n` +
               `3. Use ${this.bot.currentPrefix}menu image for visual menu\n` +
               `4. Contact owner for help: ${this.bot.config.owner.split('@')[0]}`;
    }

    splitMessage(text, maxLength) {
        const chunks = [];
        while (text.length > maxLength) {
            let chunk = text.substring(0, maxLength);
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > 0) {
                chunk = chunk.substring(0, lastSpace);
            }
            chunks.push(chunk);
            text = text.substring(chunk.length).trim();
        }
        if (text.length > 0) {
            chunks.push(text);
        }
        return chunks;
    }

    async broadcast(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const broadcastMessage = args.join(' ');
        if (!broadcastMessage) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !broadcast <message>'
            });
            return;
        }

        // Get all chats
        const chats = await this.bot.sock.groupFetchAllParticipating();
        
        let sent = 0;
        for (const chatId in chats) {
            try {
                await this.bot.sock.sendMessage(chatId, {
                    text: `📢 *BROADCAST*\n\n${broadcastMessage}\n\n- Cannoh MD Bot`
                });
                sent++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limit
            } catch (error) {
                console.error(`Failed to send to ${chatId}:`, error);
            }
        }

        await this.bot.sock.sendMessage(message.key.remoteJid, {
            text: `✅ Broadcast sent to ${sent} groups.`
        });
    }

    async evalCode(message, args) {
        if (!this.isOwner(message)) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ This command is for owner only!'
            });
            return;
        }

        const code = args.join(' ');
        if (!code) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !eval <javascript code>'
            });
            return;
        }

        try {
            const result = eval(code);
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `✅ Evaluation Result:\n\`\`\`javascript\n${result}\n\`\`\``
            });
        } catch (error) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `❌ Evaluation Error:\n\`\`\`javascript\n${error.message}\n\`\`\``
            });
        }
    }

    async handleAI(message, args) {
        const prompt = args.join(' ');
        if (!prompt) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !ai <prompt>'
            });
            return;
        }

        await this.bot.aiHandler.handleChatGPT(message, prompt);
    }

    async handleGPT(message, args) {
        const prompt = args.join(' ');
        if (!prompt) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: 'Usage: !gpt <prompt>'
            });
            return;
        }

        await this.bot.aiHandler.handleChatGPT(message, prompt);
    }

    isOwner(message) {
        const userNumber = message.key.remoteJid.split('@')[0];
        const ownerNumber = this.bot.config.owner.split('@')[0];
        return userNumber === ownerNumber;
    }
}

module.exports = CommandHandler;
