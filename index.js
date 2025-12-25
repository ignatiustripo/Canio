const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Environment variables
const SESSION_ID = process.env.SESSION;
const BAD_WORDS = process.env.BAD_WORD ? process.env.BAD_WORD.split(',') : [];
const OWNERS = process.env.DEV ? process.env.DEV.split(',').map(num => `${num}@s.whatsapp.net`) : [];
const APP_NAME = process.env.APP_NAME || 'cannio';
const MENU_TYPE = process.env.MENU_TYPE || 'VIDEO';
const DATABASE_URL = process.env.DATABASE_URL;

let sock;
let db;

// Initialize PostgreSQL if DATABASE_URL exists
if (DATABASE_URL) {
  db = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  db.connect().then(() => console.log('✅ Database connected')).catch(console.error);
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();
  
  sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan QR code above with WhatsApp');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Reconnecting...');
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp bot connected!');
      console.log(`🤖 Bot Name: ${APP_NAME}`);
      console.log(`👑 Owners: ${OWNERS.length}`);
      console.log(`🚫 Bad Words: ${BAD_WORDS.length}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;
    const isGroup = sender.endsWith('@g.us');
    
    console.log(`📩 Message from ${sender}: ${text}`);
    
    // Check for bad words
    const containsBadWord = BAD_WORDS.some(word => 
      text.toLowerCase().includes(word.toLowerCase())
    );
    
    if (containsBadWord) {
      console.log(`🚫 Bad word detected from ${sender}`);
      // You can add action here (delete, warn, kick)
    }
    
    // Handle commands
    if (text.startsWith('!')) {
      const command = text.toLowerCase().slice(1).split(' ')[0];
      
      switch(command) {
        case 'ping':
          await sock.sendMessage(sender, { text: '🏓 Pong!' });
          break;
          
        case 'menu':
          if (MENU_TYPE === 'VIDEO') {
            await sock.sendMessage(sender, { 
              video: { url: 'https://example.com/menu.mp4' },
              caption: '📱 *Bot Menu*\n\n1. !ping\n2. !info\n3. !help'
            });
          } else if (MENU_TYPE === 'IMAGE') {
            await sock.sendMessage(sender, { 
              image: { url: 'https://example.com/menu.jpg' },
              caption: '📱 *Bot Menu*'
            });
          } else {
            await sock.sendMessage(sender, { 
              text: '📱 *Bot Menu*\n\n• !ping - Test bot\n• !info - Bot info\n• !help - Show help'
            });
          }
          break;
          
        case 'info':
          const info = `
🤖 *${APP_NAME} Bot Info*
━━━━━━━━━━━━━━━━
👑 Owners: ${OWNERS.length}
🚫 Bad Words: ${BAD_WORDS.length}
📊 Menu Type: ${MENU_TYPE}
✅ Status: Active
━━━━━━━━━━━━━━━━
          `;
          await sock.sendMessage(sender, { text: info });
          break;
          
        case 'restart':
          if (OWNERS.includes(sender)) {
            await sock.sendMessage(sender, { text: '🔄 Restarting bot...' });
            process.exit(0);
          }
          break;
      }
    }
  });
}

// Start the bot
connectToWhatsApp().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

// Keep alive for Heroku
setInterval(() => {
  if (sock) {
    console.log('🫀 Heartbeat - Bot is alive');
  }
}, 60000);

// Handle process exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (db) db.end();
  process.exit(0);
});
