const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

class Downloader {
    constructor() {
        this.downloadsDir = './downloads';
        if (!fs.existsSync(this.downloadsDir)) {
            fs.mkdirSync(this.downloadsDir, { recursive: true });
        }
    }

    async downloadYouTubeVideo(url, quality = 'highest') {
        try {
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { quality });
            
            if (!format) {
                throw new Error('No suitable format found');
            }

            const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
            const filename = `${title}_${Date.now()}.mp4`;
            const filepath = path.join(this.downloadsDir, filename);

            const stream = ytdl(url, { quality: format.itag });
            const writeStream = fs.createWriteStream(filepath);

            return new Promise((resolve, reject) => {
                stream.pipe(writeStream);
                writeStream.on('finish', () => resolve({
                    filepath,
                    filename,
                    title,
                    duration: info.videoDetails.lengthSeconds
                }));
                writeStream.on('error', reject);
            });
        } catch (error) {
            throw new Error(`YouTube download failed: ${error.message}`);
        }
    }

    async downloadAudio(url) {
        try {
            const info = await ytdl.getInfo(url);
            const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
            
            const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
            const filename = `${title}_${Date.now()}.mp3`;
            const filepath = path.join(this.downloadsDir, filename);

            const stream = ytdl(url, { format: audioFormat });
            const writeStream = fs.createWriteStream(filepath);

            return new Promise((resolve, reject) => {
                stream.pipe(writeStream);
                writeStream.on('finish', () => resolve({
                    filepath,
                    filename,
                    title,
                    duration: info.videoDetails.lengthSeconds
                }));
                writeStream.on('error', reject);
            });
        } catch (error) {
            throw new Error(`Audio download failed: ${error.message}`);
        }
    }

    async searchYouTube(query) {
        try {
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/search`,
                {
                    params: {
                        part: 'snippet',
                        q: query,
                        key: process.env.YOUTUBE_API_KEY,
                        maxResults: 5,
                        type: 'video'
                    }
                }
            );

            return response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.default.url,
                url: `https://youtube.com/watch?v=${item.id.videoId}`
            }));
        } catch (error) {
            throw new Error(`YouTube search failed: ${error.message}`);
        }
    }
}

module.exports = Downloader;
