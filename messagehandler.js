
## 🎮 **10. handlers/messageHandler.js**

```javascript
class MessageHandler {
    constructor(bot) {
        this.bot = bot;
    }

    async handleMessage(m) {
        try {
            const message = m.messages[0];
            if (!message?.message || message.key.fromMe) return;

            // Anti-ban protection
            if (!await this.bot.featureHandler.antiBanProtection(message)) {
                return;
            }

            // Auto read messages
            if (this.bot.config.features.autoRead) {
                await this.bot.sock.readMessages([message.key]);
            }

            // Save for anti-delete
            const msgText = this.extractMessageText(message);
            if (msgText) {
                this.bot.featureHandler.deletedMessages.set(message.key.id, msgText);
            }

            // Auto save contacts
            if (this.bot.config.features.autoSaveContacts) {
                const sender = message.key.remoteJid;
                if (!sender.includes('-')) {
                    await this.bot.featureHandler.autoSaveContact(sender);
                }
            }

            // Auto react
            if (this.bot.config.features.autoReact) {
                await this.bot.featureHandler.autoReactToMessage(message);
            }

            // Handle view-once messages
            if (this.bot.config.features.viewOnceDownload) {
                await this.bot.featureHandler.downloadViewOnce(message);
            }

            // Handle commands
            const text = msgText || '';
            const userPrefix = this.bot.getUserPrefix(message.key.remoteJid);
            
            if (text.startsWith(userPrefix)) {
                const args = text.slice(userPrefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();
                
                await this.bot.commandHandler.handleCommand(message, command, args);
                return;
            }

            // Smart chatbot (reply to non-commands)
            else if (this.bot.config.features.smartChatbot && text) {
                await this.handleSmartReply(message, text);
            }

        } catch (error) {
            console.error('Message handler error:', error);
        }
    }

    extractMessageText(message) {
        const msg = message.message;
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        if (msg.imageMessage?.caption) return msg.imageMessage.caption;
        if (msg.videoMessage?.caption) return msg.videoMessage.caption;
        return '';
    }

    async handleSmartReply(message, text) {
        const lowerText = text.toLowerCase();
        const sender = message.key.remoteJid;
        
        const responses = {
            'hello': '👋 Hello! How can I help you today?',
            'hi': '👋 Hi there!',
            'how are you': '🤖 I\'m doing great! Thanks for asking!',
            'thank you': '😊 You\'re welcome!',
            'thanks': '😊 You\'re welcome!',
            'bot': '🤖 Yes, I\'m an AI-powered WhatsApp bot!',
            'help': '📝 Type !help to see all available commands!'
        };

        for (const [key, response] of Object.entries(responses)) {
            if (lowerText.includes(key)) {
                await this.bot.sock.sendMessage(sender, { text: response });
                return;
            }
        }

        // If no match and AI features enabled, use AI
        if (this.bot.config.features.aiFeatures && text.length > 5) {
            const aiResponse = await this.bot.aiHandler.handleAIRequest(text, sender);
            await this.bot.sock.sendMessage(sender, {
                text: `💡 ${aiResponse}`
            });
        }
    }
}

module.exports = MessageHandler;
