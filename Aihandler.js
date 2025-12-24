const { OpenAI } = require('openai');

class AIHandler {
    constructor(bot) {
        this.bot = bot;
        this.openai = null;
        this.chatHistory = new Map();
        
        if (this.bot.config.openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: this.bot.config.openaiApiKey
            });
        }
    }

    async handleAIRequest(prompt, userId) {
        try {
            if (!this.openai) {
                return "⚠️ AI features are not configured. Please add OpenAI API key.";
            }

            if (!this.chatHistory.has(userId)) {
                this.chatHistory.set(userId, []);
            }
            
            const history = this.chatHistory.get(userId);
            history.push({ role: 'user', content: prompt });
            
            if (history.length > 10) {
                history.splice(0, history.length - 10);
            }

            const response = await this.openai.chat.completions.create({
                model: this.bot.config.ai.model,
                messages: [
                    { role: 'system', content: 'You are a helpful WhatsApp assistant. Be concise and helpful.' },
                    ...history
                ],
                temperature: this.bot.config.ai.temperature,
                max_tokens: this.bot.config.ai.maxTokens
            });

            const aiResponse = response.choices[0].message.content;
            
            history.push({ role: 'assistant', content: aiResponse });
            this.chatHistory.set(userId, history);

            return aiResponse;

        } catch (error) {
            console.error('AI Error:', error);
            return "❌ AI service error. Please try again later.";
        }
    }

    async handleChatGPT(message, prompt) {
        if (!this.bot.config.features.chatGPT) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ ChatGPT feature is disabled'
            });
            return;
        }

        await this.bot.sock.sendPresenceUpdate('composing', message.key.remoteJid);
        
        try {
            const response = await this.handleAIRequest(prompt, message.key.remoteJid);
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: `🤖 *ChatGPT*\n\n${response}`
            });
        } catch (error) {
            await this.bot.sock.sendMessage(message.key.remoteJid, {
                text: '❌ Failed to get AI response'
            });
        }
    }
}

module.exports = AIHandler;
