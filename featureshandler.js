const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class FeatureHandler {
    constructor(bot) {
        this.bot = bot;
        this.deletedMessages = new Map();
        
        // Typing detection
        this.typingUsers = new Map();
        this.typingHistory = new Map();
        this.lastNotification = new Map();
        this.typingPatterns = new Map();
        this.typingLogs = [];
        
        this.loadTypingHistory();
    }

    async handleTypingUpdate(update) {
        if (!this.bot.config.features.typingDetection) return;
        
        try {
            const { id, presences } = update;
            
            for (const [participant, presence] of Object.entries(presences)) {
                await this.processTypingPresence(id, participant, presence);
            }
        } catch (error) {
            console.error('Typing detection error:', error);
        }
    }

    async processTypingPresence(chatId, participant, presence) {
        const { lastKnownPresence, lastSeen } = presence;
        const now = Date.now();
        
        if (this.bot.config.typingDetection.ignoreBots && 
            participant.includes(':') && participant.includes('@')) {
            return;
        }
        
        if (this.bot.config.typingDetection.ignoredUsers.includes(participant)) {
            return;
        }
        
        const userInfo = await this.getUserInfo(participant);
        const userName = userInfo.name || participant.split('@')[0];
        
        switch (lastKnownPresence) {
            case 'composing':
                await this.handleUserStartedTyping(chatId, participant, userName, now);
                break;
            case 'paused':
            case 'available':
                await this.handleUserStoppedTyping(chatId, participant, userName, now);
                break;
            case 'recording':
                if (this.bot.config.features.fakeRecording) {
                    await this.handleUserRecording(chatId, participant, userName);
                }
                break;
        }
        
        this.updateTypingPatterns(participant, lastKnownPresence, now);
    }

    async handleUserStartedTyping(chatId, userId, userName, timestamp) {
        const lastNotify = this.lastNotification.get(userId) || 0;
        if (Date.now() - lastNotify < this.bot.config.typingDetection.cooldown) {
            return;
        }
        
        this.typingUsers.set(userId, {
            startTime: timestamp,
            messageCount: 0,
            chatId,
            userName
        });
        
        this.logTypingEvent({
            type: 'start',
            userId,
            userName,
            chatId,
            timestamp,
            duration: 0
        });
        
        if (this.bot.config.typingDetection.notifyOwner) {
            await this.sendTypingNotification(userId, userName, chatId, 'started');
        }
        
        if (this.bot.config.typingDetection.monitoredUsers.includes(userId)) {
            await this.sendPriorityNotification(userId, userName, chatId, 'started');
        }
    }

    async handleUserStoppedTyping(chatId, userId, userName, timestamp) {
        const typingData = this.typingUsers.get(userId);
        if (!typingData) return;
        
        const duration = timestamp - typingData.startTime;
        
        this.logTypingEvent({
            type: 'stop',
            userId,
            userName,
            chatId,
            timestamp,
            duration,
            messageCount: typingData.messageCount
        });
        
        this.typingUsers.delete(userId);
        
        if (duration > 30000) {
            await this.sendLongTypingNotification(userId, userName, duration);
        }
        
        this.updateTypingAnalytics(userId, duration);
    }

    async handleUserRecording(chatId, userId, userName) {
        this.logTypingEvent({
            type: 'recording',
            userId,
            userName,
            chatId,
            timestamp: Date.now()
        });
        
        if (this.bot.config.features.fakeRecording) {
            await this.bot.sock.sendMessage(this.bot.config.owner, {
                text: `🎙️ ${userName} is recording voice message in ${chatId.includes('@g.us') ? 'group' : 'chat'}`
            });
        }
    }

    async sendTypingNotification(userId, userName, chatId, action) {
        try {
            const chatType = chatId.includes('@g.us') ? 'Group' : 'Private Chat';
            const chatName = await this.getChatName(chatId);
            
            const message = `✍️ *TYPING DETECTED*\n\n` +
                           `👤 *User:* ${userName}\n` +
                           `📱 *Number:* ${userId.split('@')[0]}\n` +
                           `💬 *Chat:* ${chatName}\n` +
                           `🏷️ *Type:* ${chatType}\n` +
                           `⏰ *Time:* ${new Date().toLocaleTimeString()}\n` +
                           `🔔 *Status:* ${action === 'started' ? 'Started typing' : 'Stopped typing'}`;
            
            await this.bot.sock.sendMessage(this.bot.config.owner, {
                text: message
            });
            
            this.lastNotification.set(userId, Date.now());
            
        } catch (error) {
            console.error('Send notification error:', error);
        }
    }

    async sendLongTypingNotification(userId, userName, duration) {
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        const message = `⏳ *LONG TYPING SESSION*\n\n` +
                       `👤 ${userName}\n` +
                       `🕒 Duration: ${minutes}m ${seconds}s\n` +
                       `📊 Average: ${this.getTypingSpeed(userId)} chars/min\n` +
                       `📈 Confidence: ${this.getTypingConfidence(userId)}%`;
        
        await this.bot.sock.sendMessage(this.bot.config.owner, { text: message });
    }

    async sendPriorityNotification(userId, userName, chatId, action) {
        const priorityMsg = `🚨 *PRIORITY USER TYPING*\n\n` +
                           `👤 ${userName}\n` +
                           `📍 ${chatId.includes('@g.us') ? 'Group' : 'DM'}\n` +
                           `🕒 ${new Date().toLocaleTimeString()}\n` +
                           `📊 History: ${this.getTypingFrequency(userId)} times today`;
        
        await this.bot.sock.sendMessage(this.bot.config.owner, {
            text: priorityMsg,
            mentions: [this.bot.config.owner]
        });
    }

    updateTypingPatterns(userId, state, timestamp) {
        if (!this.bot.config.typingDetection.trackPatterns) return;
        
        const userPatterns = this.typingPatterns.get(userId) || {
            totalSessions: 0,
            totalDuration: 0,
            averageDuration: 0,
            lastTyping: null,
            sessionsToday: 0,
            peakHours: new Map()
        };
        
        const hour = new Date(timestamp).getHours();
        userPatterns.peakHours.set(hour, (userPatterns.peakHours.get(hour) || 0) + 1);
        
        if (state === 'composing') {
            userPatterns.lastTyping = timestamp;
            userPatterns.sessionsToday++;
        }
        
        this.typingPatterns.set(userId, userPatterns);
        
        if (this.typingLogs.length % 10 === 0) {
            this.saveTypingHistory();
        }
    }

    updateTypingAnalytics(userId, duration) {
        const patterns = this.typingPatterns.get(userId);
        if (patterns) {
            patterns.totalSessions++;
            patterns.totalDuration += duration;
            patterns.averageDuration = patterns.totalDuration / patterns.totalSessions;
            this.typingPatterns.set(userId, patterns);
        }
    }

    getTypingSpeed(userId) {
        const patterns = this.typingPatterns.get(userId);
        if (!patterns || patterns.totalSessions === 0) return 'N/A';
        const avgDuration = patterns.averageDuration / 1000;
        const avgChars = avgDuration * 5;
        return Math.round(avgChars * 60);
    }

    getTypingConfidence(userId) {
        const patterns = this.typingPatterns.get(userId);
        if (!patterns) return 0;
        const consistency = Math.min(patterns.totalSessions / 10, 1) * 100;
        return Math.round(consistency);
    }

    getTypingFrequency(userId) {
        const patterns = this.typingPatterns.get(userId);
        return patterns ? patterns.sessionsToday : 0;
    }

    async getUserInfo(userId) {
        try {
            const [user] = await this.bot.sock.onWhatsApp(userId);
            return {
                name: user?.name || userId.split('@')[0],
                exists: user?.exists || false
            };
        } catch (error) {
            return { name: userId.split('@')[0], exists: false };
        }
    }

    async getChatName(chatId) {
        if (chatId.includes('@g.us')) {
            try {
                const groupMetadata = await this.bot.sock.groupMetadata(chatId);
                return groupMetadata.subject || 'Group';
            } catch {
                return 'Group';
            }
        } else {
            const userInfo = await this.getUserInfo(chatId);
            return userInfo.name;
        }
    }

    logTypingEvent(event) {
        if (!this.bot.config.typingDetection.saveLogs) return;
        
        this.typingLogs.push(event);
        
        if (this.typingLogs.length > 1000) {
            this.typingLogs = this.typingLogs.slice(-1000);
        }
        
        if (this.typingLogs.length % 50 === 0) {
            this.saveTypingLogs();
        }
    }

    saveTypingLogs() {
        try {
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            const logFile = path.join(logsDir, `typing_${new Date().toISOString().split('T')[0]}.json`);
            fs.writeFileSync(logFile, JSON.stringify(this.typingLogs, null, 2));
        } catch (error) {
            console.error('Save typing logs error:', error);
        }
    }

    saveTypingHistory() {
        try {
            const history = {
                patterns: Array.from(this.typingPatterns.entries()),
                lastNotification: Array.from(this.lastNotification.entries()),
                timestamp: Date.now()
            };
            
            fs.writeFileSync(
                './storage/typing_history.json',
                JSON.stringify(history, null, 2)
            );
        } catch (error) {
            console.error('Save typing history error:', error);
        }
    }

    loadTypingHistory() {
        try {
            const data = fs.readFileSync('./storage/typing_history.json', 'utf8');
            const history = JSON.parse(data);
            
            this.typingPatterns = new Map(history.patterns || []);
            this.lastNotification = new Map(history.lastNotification || []);
            
            console.log(`✅ Loaded typing history for ${this.typingPatterns.size} users`);
        } catch (error) {
            console.log('ℹ️ No typing history found');
        }
    }

    getActiveTypingUsers() {
        const active = [];
        const now = Date.now();
        
        for (const [userId, data] of this.typingUsers.entries()) {
            const duration = now - data.startTime;
            active.push({
                userId,
                userName: data.userName,
                chatId: data.chatId,
                duration,
                messageCount: data.messageCount
            });
        }
        
        return active;
    }

    getUserTypingStats(userId) {
        const patterns = this.typingPatterns.get(userId);
        if (!patterns) return null;
        
        let peakHour = 0;
        let maxCount = 0;
        for (const [hour, count] of patterns.peakHours.entries()) {
            if (count > maxCount) {
                maxCount = count;
                peakHour = hour;
            }
        }
        
        return {
            totalSessions: patterns.totalSessions,
            totalDuration: patterns.totalDuration,
            averageDuration: patterns.averageDuration,
            sessionsToday: patterns.sessionsToday,
            peakHour: `${peakHour}:00`,
            lastTyping: patterns.lastTyping ? new Date(patterns.lastTyping).toLocaleString() : 'Never',
            typingSpeed: this.getTypingSpeed(userId),
            confidence: this.getTypingConfidence(userId)
        };
    }

    // Auto View Status
    async handleStatusView(update) {
        if (!this.bot.config.features.autoViewStatus) return;
        try {
            // Implementation depends on Baileys API
        } catch (error) {
            console.error('Status view error:', error);
        }
    }

    // Anti-Delete Messages
    async handleDeleteMessage(deleteData) {
        try {
            const { keys } = deleteData;
            keys.forEach(async (key) => {
                const savedMsg = this.deletedMessages.get(key.id);
                if (savedMsg) {
                    const sender = key.remoteJid;
                    const text = `🚫 *DELETED MESSAGE RECOVERED*\n\n` +
                                `From: @${key.participant.split('@')[0]}\n` +
                                `Message: ${savedMsg}\n` +
                                `Time: ${new Date().toLocaleString()}`;
                    
                    await this.bot.sock.sendMessage(sender, {
                        text: text,
                        mentions: [key.participant]
                    });
                    
                    this.deletedMessages.delete(key.id);
                }
            });
        } catch (error) {
            console.error('Anti-delete error:', error);
        }
    }

    // Always Online
    async keepOnline() {
        setInterval(async () => {
            try {
                await this.bot.sock.sendPresenceUpdate('available');
            } catch (error) {
                console.error('Keep online error:', error);
            }
        }, 60000);
    }

    // Auto Bio Update
    startAutoBioUpdate() {
        cron.schedule('0 * * * *', async () => {
            try {
                const bios = [
                    "🤖 Powered by Cannoh MD | Online 24/7",
                    "🚀 Bot Active | !help for commands",
                    "🔥 Multiple Features Enabled | Status: Online",
                    "💫 AI-Powered WhatsApp Bot"
                ];
                
                const randomBio = bios[Math.floor(Math.random() * bios.length)];
                await this.bot.sock.updateProfileStatus(randomBio);
                console.log('Bio updated:', randomBio);
            } catch (error) {
                console.error('Bio update error:', error);
            }
        });
    }

    // Auto React to Messages
    async autoReactToMessage(message) {
        if (!this.bot.config.features.autoReact) return;
        if (Math.random() > this.bot.config.autoReact.probability) return;
        
        try {
            const reaction = this.bot.config.autoReact.reactions[
                Math.floor(Math.random() * this.bot.config.autoReact.reactions.length)
            ];
            
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                react: {
                    text: reaction,
                    key: message.key
                }
            });
        } catch (error) {
            console.error('Auto react error:', error);
        }
    }

    // Anti-Call Mode
    async handleCall(call) {
        try {
            if (call.status === 'offer') {
                await this.bot.sock.rejectCall(call.id, call.from);
                console.log(`Rejected call from ${call.from}`);
                
                await this.bot.sock.sendMessage(call.from, {
                    text: '📞 Call rejected automatically. Bot does not accept calls. Message only.'
                });
            }
        } catch (error) {
            console.error('Anti-call error:', error);
        }
    }

    // Download View-Once Photos
    async downloadViewOnce(message) {
        if (!message.message?.viewOnceMessageV2) return;
        
        try {
            const mediaMessage = message.message.viewOnceMessageV2.message;
            let buffer;
            
            if (mediaMessage.imageMessage) {
                buffer = await this.bot.sock.downloadMediaMessage(message);
                
                const filename = `viewonce_${Date.now()}.jpg`;
                fs.writeFileSync(path.join(__dirname, '../downloads/', filename), buffer);
                
                await this.bot.sock.sendMessage(this.bot.config.owner, {
                    image: buffer,
                    caption: `🔓 View-Once Image Captured\nFrom: ${message.key.remoteJid}\nTime: ${new Date().toLocaleString()}`
                });
            }
        } catch (error) {
            console.error('View-once download error:', error);
        }
    }

    // Auto Save Contacts
    async autoSaveContact(number) {
        try {
            const contactId = number.includes('@') ? number : `${number}@s.whatsapp.net`;
            await this.bot.sock.updateContact(contactId, '');
            console.log(`Auto-saved contact: ${contactId}`);
        } catch (error) {
            console.error('Auto-save contact error:', error);
        }
    }

    // Anti-Ban Protection
    async antiBanProtection(message) {
        if (!this.bot.config.features.antiBan) return true;
        
        const now = Date.now();
        const user = message.key.remoteJid;
        
        // Implement rate limiting logic
        // ... (store message counts per user per minute)
        
        if (this.bot.config.antiBan.randomDelay) {
            const delay = Math.floor(Math.random() * 2000) + 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return true;
    }
}

module.exports = FeatureHandler;
