class AntiDelete {
    constructor() {
        this.deletedMessages = new Map();
        this.messageHistory = new Map();
    }

    saveMessage(message) {
        try {
            const msgId = message.key.id;
            const msgText = this.extractMessageText(message);
            
            if (msgText) {
                this.deletedMessages.set(msgId, {
                    text: msgText,
                    sender: message.key.remoteJid,
                    participant: message.key.participant || message.key.remoteJid,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 1000 messages
                if (this.deletedMessages.size > 1000) {
                    const firstKey = this.deletedMessages.keys().next().value;
                    this.deletedMessages.delete(firstKey);
                }
            }
        } catch (error) {
            console.error('Save message error:', error);
        }
    }

    extractMessageText(message) {
        const msg = message.message;
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        if (msg.imageMessage?.caption) return msg.imageMessage.caption;
        if (msg.videoMessage?.caption) return msg.videoMessage.caption;
        if (msg.audioMessage?.caption) return msg.audioMessage.caption;
        return '';
    }

    getDeletedMessage(messageId) {
        return this.deletedMessages.get(messageId);
    }

    removeDeletedMessage(messageId) {
        this.deletedMessages.delete(messageId);
    }

    formatRecoveredMessage(deletedMsg) {
        const time = new Date(deletedMsg.timestamp).toLocaleTimeString();
        const senderName = deletedMsg.participant.split('@')[0];
        
        return `🚫 *DELETED MESSAGE RECOVERED*\n\n` +
               `👤 From: @${senderName}\n` +
               `🕒 Time: ${time}\n` +
               `💬 Message: ${deletedMsg.text}\n\n` +
               `⚠️ This message was deleted by the sender.`;
    }
}

module.exports = AntiDelete;
