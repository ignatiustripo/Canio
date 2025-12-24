module.exports = {
    getCommandsData: (prefix = '!') => {
        return [
            {
                name: 'help',
                description: 'Show all commands',
                category: 'settings',
                prefix: prefix
            },
            {
                name: 'menu',
                description: 'Generate menu image',
                category: 'settings',
                prefix: prefix
            },
            {
                name: 'ping',
                description: 'Check bot status',
                category: 'stats',
                prefix: prefix
            },
            {
                name: 'features',
                description: 'Show feature status',
                category: 'settings',
                prefix: prefix
            },
            {
                name: 'toggle',
                description: 'Enable/disable features',
                category: 'settings',
                prefix: prefix
            },
            {
                name: 'setprefix',
                description: 'Change bot prefix',
                category: 'settings',
                prefix: prefix,
                admin: true
            },
            {
                name: 'setmode',
                description: 'Change bot mode',
                category: 'settings',
                prefix: prefix,
                admin: true
            },
            {
                name: 'song',
                description: 'Download songs',
                category: 'media',
                prefix: prefix
            },
            {
                name: 'video',
                description: 'Download videos',
                category: 'media',
                prefix: prefix
            },
            {
                name: 'status',
                description: 'Download status',
                category: 'media',
                prefix: prefix
            },
            {
                name: 'ai',
                description: 'AI chat',
                category: 'ai',
                prefix: prefix
            },
            {
                name: 'gpt',
                description: 'ChatGPT',
                category: 'ai',
                prefix: prefix
            },
            {
                name: 'record',
                description: 'Fake recording',
                category: 'fun',
                prefix: prefix
            },
            {
                name: 'typing',
                description: 'Fake typing',
                category: 'fun',
                prefix: prefix
            },
            {
                name: 'whotyping',
                description: 'Who is typing',
                category: 'stats',
                prefix: prefix
            },
            {
                name: 'typingstats',
                description: 'Typing analytics',
                category: 'stats',
                prefix: prefix
            },
            {
                name: 'approve',
                description: 'Approve user',
                category: 'admin',
                prefix: prefix,
                admin: true
            },
            {
                name: 'remove',
                description: 'Remove user',
                category: 'admin',
                prefix: prefix,
                admin: true
            },
            {
                name: 'broadcast',
                description: 'Broadcast message',
                category: 'admin',
                prefix: prefix,
                admin: true
            },
            {
                name: 'eval',
                description: 'Execute code',
                category: 'admin',
                prefix: prefix,
                owner: true
            }
        ];
    },
    
    getFeaturesData: (featuresConfig) => {
        return [
            { name: 'Auto View Status', enabled: featuresConfig.autoViewStatus },
            { name: 'Anti-Delete Messages', enabled: featuresConfig.antiDelete },
            { name: 'Media Download', enabled: featuresConfig.downloadMedia },
            { name: 'View-Once Photos', enabled: featuresConfig.viewOnceDownload },
            { name: 'Fake Recording', enabled: featuresConfig.fakeRecording },
            { name: 'Always Online', enabled: featuresConfig.alwaysOnline },
            { name: 'Fake Typing', enabled: featuresConfig.fakeTyping },
            { name: 'Auto Like Status', enabled: featuresConfig.autoLikeStatus },
            { name: 'AI Features', enabled: featuresConfig.aiFeatures },
            { name: 'ChatGPT', enabled: featuresConfig.chatGPT },
            { name: 'Status Downloader', enabled: featuresConfig.statusDownloader },
            { name: 'Anti-Call Mode', enabled: featuresConfig.antiCall },
            { name: 'Smart Chatbot', enabled: featuresConfig.smartChatbot },
            { name: 'Auto Bio Update', enabled: featuresConfig.autoBioUpdate },
            { name: 'Auto React', enabled: featuresConfig.autoReact },
            { name: 'Auto Read Messages', enabled: featuresConfig.autoRead },
            { name: 'Auto Save Contacts', enabled: featuresConfig.autoSaveContacts },
            { name: 'Anti-Ban Protection', enabled: featuresConfig.antiBan },
            { name: 'Ban-Safe Mode', enabled: featuresConfig.banSafeMode },
            { name: 'Prefix Customization', enabled: featuresConfig.prefixCustomization },
            { name: 'Mode Switch', enabled: featuresConfig.modeSwitch },
            { name: 'Typing Detection', enabled: featuresConfig.typingDetection }
        ];
    }
};
