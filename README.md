# 🚀 **Cannoh MD - Advanced WhatsApp Bot**

![Cannoh MD Banner](https://img.shields.io/badge/Cannoh-MD-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-3.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-≥16.0.0-brightgreen?style=for-the-badge)

<div align="center">
  
  ## 🎯 **One-Click Deployment**
  
  [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ignatiustripo/Canio)
  [![Deploy on Railway](https://railway.app/button.svg)](https://github.com/ignatiustripo/Canio)
  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ignatiustripo/Canio)
  [![Run on Replit](https://replit.com/badge/github/https://github.com/ignatiustripo/Canio)](https://replit.com/github/https://github.com/ignatiustripo/Canio)
  
  <button onclick="copyAllToClipboard()" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 10px;">
    📋 Copy All README Content
  </button>
  
  <div id="copyStatus" style="color: green; margin-top: 10px;"></div>
  
  

## 📋 **Table of Contents**
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📖 Commands](#-commands)
- [🎨 Menu System](#-menu-system)
- [🌐 Deployment Guides](#-deployment-guides)
- [🛠️ Project Structure](#️-project-structure)
- [🔧 Development](#-development)
- [⚠️ Important Notes](#️-important-notes)
- [🐛 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📞 Support](#-support)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

## ✨ **Features**

### 🔥 **Core Features (22 Total)**
| Feature | Status | Description |
|---------|--------|-------------|
| **Auto View Status** 👀 | ✅ | Automatically views status updates |
| **Anti-Delete Messages** 🛡️ | ✅ | Recovers deleted messages |
| **Media Download** 📥 | ✅ | Download songs, videos, status |
| **View-Once Photos** 🖼️ | ✅ | Save view-once media |
| **Fake Recording** 🎙️ | ✅ | Fake recording indicator |
| **Always Online** 🟢 | ✅ | Stay online 24/7 |
| **Fake Typing** ⌨️ | ✅ | Fake typing indicator |
| **Auto Like Status** ❤️ | ✅ | Automatically like status |
| **AI Smart Features** 🤖 | ✅ | AI-powered responses |
| **ChatGPT Integration** 🧠 | ✅ | OpenAI GPT integration |
| **Status Downloader** 📸 | ✅ | Download WhatsApp status |
| **Anti-Call Mode** 🚫 | ✅ | Auto-reject calls |
| **Smart Chatbot** 💡 | ✅ | Intelligent auto-replies |
| **Auto Bio Update** 📝 | ✅ | Auto-update bio periodically |
| **Auto React** 😍 | ✅ | Auto-react to messages |
| **Auto Read Messages** 👁️ | ✅ | Auto-read messages |
| **Auto Save Contacts** 📇 | ✅ | Auto-save new contacts |
| **Anti-Ban Protection** 🛡️ | ✅ | Prevent WhatsApp bans |
| **Ban-Safe Mode** 🚀 | ✅ | Safe mode for ban prevention |
| **Prefix Customization** ⚡ | ✅ | Custom command prefixes |
| **Public/Private Mode** 🔒 | ✅ | Control bot access |
| **Typing Detection** 👁️ | ✅ | Detect when users are typing |

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- WhatsApp account (phone number)
- FFmpeg (for media processing)

### **Manual Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/cannoh-md-bot.git
cd cannoh-md-bot

# Run setup script
chmod +x setup.sh
./setup.sh

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start the bot
npm start

# Scan QR code with WhatsApp
# Open WhatsApp > Settings > Linked Devices > Scan QR
