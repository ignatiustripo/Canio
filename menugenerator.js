const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const gradient = require('gradient-string');
const figlet = require('figlet');
const sharp = require('sharp');

class MenuGenerator {
    constructor(botName = "Cannoh MD") {
        this.botName = botName;
        this.fonts = {
            title: '50px "Arial Bold"',
            subtitle: '30px "Arial"',
            feature: '24px "Arial"',
            command: '20px "Consolas"',
            footer: '18px "Arial"'
        };
        this.colors = {
            primary: '#FF6B6B',
            secondary: '#4ECDC4',
            accent: '#45B7D1',
            dark: '#1A1A2E',
            light: '#F0F0F0',
            success: '#96CEB4',
            warning: '#FFEAA7',
            danger: '#FF9AA2'
        };
        this.gradients = [
            ['#FF6B6B', '#4ECDC4', '#45B7D1'],
            ['#667eea', '#764ba2', '#f093fb'],
            ['#f093fb', '#f5576c', '#4facfe'],
            ['#43e97b', '#38f9d7', '#fa709a']
        ];
        
        this.assetsDir = path.join(__dirname, '../assets');
        this.outputDir = path.join(__dirname, '../output');
        fs.ensureDirSync(this.assetsDir);
        fs.ensureDirSync(this.outputDir);
    }

    async generateMenuImage(features, commands) {
        try {
            const canvas = createCanvas(1200, 1800);
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1A1A2E');
            gradient.addColorStop(1, '#16213E');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            await this.addDecorations(ctx);
            await this.addHeader(ctx);
            await this.addFeaturesList(ctx, features);
            await this.addCommandsList(ctx, commands);
            await this.addFooter(ctx);
            
            const buffer = canvas.toBuffer('image/png');
            const filename = `cannoh_md_menu_${Date.now()}.png`;
            const filepath = path.join(this.outputDir, filename);
            
            await sharp(buffer)
                .png({ quality: 90, compressionLevel: 9 })
                .toFile(filepath);
            
            await this.createThumbnail(buffer, filename);
            
            console.log(`✅ Menu image generated: ${filename}`);
            return { buffer, filepath, filename };
            
        } catch (error) {
            console.error('Menu generation error:', error);
            return this.generateFallbackMenu();
        }
    }

    async addHeader(ctx) {
        const canvas = ctx.canvas;
        
        const titleGradient = ctx.createLinearGradient(100, 50, canvas.width - 100, 150);
        titleGradient.addColorStop(0, this.colors.primary);
        titleGradient.addColorStop(0.5, this.colors.secondary);
        titleGradient.addColorStop(1, this.colors.accent);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.roundRect(50, 50, canvas.width - 100, 200, 20);
        ctx.fill();
        
        ctx.font = this.fonts.title;
        ctx.textAlign = 'center';
        
        const textGradient = ctx.createLinearGradient(0, 100, canvas.width, 100);
        textGradient.addColorStop(0, '#FFD166');
        textGradient.addColorStop(0.5, '#06D6A0');
        textGradient.addColorStop(1, '#118AB2');
        
        ctx.fillStyle = textGradient;
        ctx.fillText(this.botName, canvas.width / 2, 120);
        
        ctx.font = '28px Arial';
        ctx.fillStyle = this.colors.light;
        ctx.fillText('Advanced WhatsApp Bot', canvas.width / 2, 170);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = this.colors.success;
        ctx.fillText('Version 3.0.0', canvas.width / 2, 200);
    }

    async addFeaturesList(ctx, features) {
        const canvas = ctx.canvas;
        let y = 280;
        
        ctx.font = this.fonts.subtitle;
        ctx.fillStyle = this.colors.primary;
        ctx.textAlign = 'left';
        ctx.fillText('🔥 FEATURES LIST', 80, y);
        
        y += 40;
        
        const columnWidth = (canvas.width - 160) / 2;
        let currentColumn = 0;
        let x = 80;
        
        for (let i = 0; i < features.length; i++) {
            if (i > 0 && i % 8 === 0) {
                currentColumn++;
                x = 80 + currentColumn * columnWidth;
                y = 320;
            }
            
            ctx.fillStyle = features[i].enabled ? this.colors.success : '#666';
            ctx.font = '22px Arial';
            
            const icons = ['⚡', '🛡️', '🤖', '🎵', '📸', '🔒', '🎭', '📊', '💾', '🚀'];
            const icon = icons[i % icons.length] || '✅';
            
            ctx.fillText(`${icon} ${features[i].name}`, x, y);
            
            ctx.fillStyle = features[i].enabled ? '#06D6A0' : '#EF476F';
            ctx.beginPath();
            ctx.arc(x + 350, y - 8, 6, 0, Math.PI * 2);
            ctx.fill();
            
            y += 40;
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, y + 20);
        ctx.lineTo(canvas.width - 80, y + 20);
        ctx.stroke();
    }

    async addCommandsList(ctx, commands) {
        const canvas = ctx.canvas;
        let y = 850;
        
        ctx.font = this.fonts.subtitle;
        ctx.fillStyle = this.colors.secondary;
        ctx.textAlign = 'left';
        ctx.fillText('⌨️ COMMANDS', 80, y);
        
        y += 40;
        
        const categories = [
            { name: '📱 Media', color: '#FF9A76', commands: commands.filter(c => c.category === 'media') },
            { name: '⚙️ Settings', color: '#4CD3C2', commands: commands.filter(c => c.category === 'settings') },
            { name: '🤖 AI', color: '#FFD166', commands: commands.filter(c => c.category === 'ai') },
            { name: '🎭 Fun', color: '#EF476F', commands: commands.filter(c => c.category === 'fun') },
            { name: '👑 Admin', color: '#118AB2', commands: commands.filter(c => c.category === 'admin') },
            { name: '📊 Stats', color: '#06D6A0', commands: commands.filter(c => c.category === 'stats') }
        ];
        
        for (const category of categories) {
            if (category.commands.length === 0) continue;
            
            ctx.font = '26px Arial Bold';
            ctx.fillStyle = category.color;
            ctx.fillText(category.name, 80, y);
            
            y += 30;
            
            for (const cmd of category.commands.slice(0, 4)) {
                ctx.font = '20px Consolas';
                ctx.fillStyle = '#E0E0E0';
                ctx.fillText(`${cmd.prefix}${cmd.name}`, 100, y);
                
                ctx.font = '18px Arial';
                ctx.fillStyle = '#A0A0A0';
                ctx.fillText(`- ${cmd.description}`, 100 + ctx.measureText(`${cmd.prefix}${cmd.name}`).width + 20, y);
                
                y += 30;
            }
            
            y += 20;
            
            if (y > 1500) break;
        }
    }

    async addFooter(ctx) {
        const canvas = ctx.canvas;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, canvas.height - 120, canvas.width, 120);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = this.colors.light;
        ctx.textAlign = 'center';
        
        const lines = [
            'Cannoh MD • Advanced WhatsApp Bot',
            'Made with ❤️ using Baileys & Node.js',
            'Support: @owner_number • Updates: @channel',
            'Use !help for detailed commands'
        ];
        
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, canvas.height - 80 + (i * 25));
        });
        
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(100, canvas.height - 120);
        ctx.lineTo(canvas.width - 100, canvas.height - 120);
        ctx.stroke();
    }

    async addDecorations(ctx) {
        const canvas = ctx.canvas;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 3;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const accentColor = 'rgba(70, 130, 180, 0.1)';
        ctx.fillStyle = accentColor;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(200, 0);
        ctx.lineTo(0, 200);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(canvas.width, canvas.height);
        ctx.lineTo(canvas.width - 200, canvas.height);
        ctx.lineTo(canvas.width, canvas.height - 200);
        ctx.fill();
    }

    async createThumbnail(buffer, originalFilename) {
        try {
            const thumbFilename = `thumb_${originalFilename}`;
            const thumbPath = path.join(this.outputDir, thumbFilename);
            
            await sharp(buffer)
                .resize(300, 450, { fit: 'cover' })
                .png({ quality: 80 })
                .toFile(thumbPath);
            
            console.log(`✅ Thumbnail created: ${thumbFilename}`);
            return thumbPath;
        } catch (error) {
            console.error('Thumbnail creation error:', error);
        }
    }

    generateFallbackMenu() {
        const canvas = createCanvas(800, 1200);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '40px Arial';
        ctx.fillText('Cannoh MD Menu', 50, 100);
        
        ctx.font = '20px Arial';
        ctx.fillText('Features are currently being generated...', 50, 150);
        ctx.fillText('Please try !help for command list', 50, 180);
        
        const buffer = canvas.toBuffer('image/png');
        return { buffer, filepath: null, filename: 'fallback_menu.png' };
    }

    async generateAsciiArtMenu(botInfo) {
        return new Promise((resolve) => {
            figlet.text(this.botName, {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (err) {
                    console.log('ASCII art error:', err);
                    resolve(this.generateSimpleAsciiMenu(botInfo));
                    return;
                }
                
                const asciiMenu = gradient.retro(`
╔══════════════════════════════════════════════════════════╗
║                    CANNOH MD BOT MENU                    ║
╚══════════════════════════════════════════════════════════╝

${data}

┌──────────────────────────────────────────────────────────┐
│ 📱 BOT INFORMATION                                       │
├──────────────────────────────────────────────────────────┤
│ 🔹 Version: ${botInfo.version || '3.0.0'}                          │
│ 🔹 Prefix: ${botInfo.prefix || '!'}                              │
│ 🔹 Mode: ${botInfo.mode || 'Public'}                           │
│ 🔹 Owner: ${botInfo.owner || 'Not set'}                        │
│ 🔹 Features: ${botInfo.featureCount || 19}/19 enabled          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🚀 QUICK COMMANDS                                        │
├──────────────────────────────────────────────────────────┤
│ !help - Show all commands                                │
│ !menu - Generate this menu image                         │
│ !features - List all features                            │
│ !ping - Check bot status                                 │
│ !toggle <feature> - Enable/disable features              │
└──────────────────────────────────────────────────────────┘

Type !help for complete command list
                `);
                
                console.log(asciiMenu);
                resolve(asciiMenu);
            });
        });
    }

    generateSimpleAsciiMenu(botInfo) {
        return `
╔══════════════════════════════════════════════════════════╗
║                    CANNOH MD WHATSAPP BOT                ║
╚══════════════════════════════════════════════════════════╝

Version: ${botInfo.version || '3.0.0'}
Prefix: ${botInfo.prefix || '!'}
Mode: ${botInfo.mode || 'Public'}
Owner: ${botInfo.owner || 'Not set'}

[!] Use !help for commands
[!] Use !menu to generate menu image
        `;
    }
}

module.exports = MenuGenerator;
