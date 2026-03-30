const chromeLauncher = require('chrome-launcher');
const { exec } = require('child_process');

class ChromeManager {
    constructor() {
        this.chrome = null;
        this.port = null;
        this.isRunning = false;
        console.log('🔧 Chrome Manager initialized');
    }

    async findChromePath() {
        // Common Chrome paths on Windows
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const chromePath of possiblePaths) {
            try {
                const fs = require('fs');
                if (fs.existsSync(chromePath)) {
                    console.log('✅ Found Chrome at:', chromePath);
                    return chromePath;
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        console.log('⚠️ Chrome not found in common paths, will rely on system PATH');
        return undefined;
    }

    async start() {
        if (this.isRunning && this.chrome) {
            console.log('✅ Chrome already running');
            return this.chrome;
        }

        console.log('🚀 Starting Chrome...');
        
        try {
            const chromePath = await this.findChromePath();
            
            // Launch Chrome with very basic flags
            this.chrome = await chromeLauncher.launch({
                chromePath: chromePath,
                chromeFlags: [
                    '--headless=new',
                    '--no-sandbox',
                    '--disable-gpu',
                    '--remote-debugging-port=9222'
                ],
                logLevel: 'error'
            });

            this.port = this.chrome.port;
            this.isRunning = true;
            
            console.log(`✅ Chrome started on port: ${this.port}`);
            
            // Don't set up exit handler - let it crash if it needs to
            return this.chrome;
            
        } catch (error) {
            console.error('❌ Failed to start Chrome:', error.message);
            this.isRunning = false;
            this.chrome = null;
            throw error;
        }
    }

    async getChrome() {
        if (!this.isRunning || !this.chrome) {
            return await this.start();
        }
        return this.chrome;
    }

    async shutdown() {
        if (this.chrome) {
            try {
                await this.chrome.kill();
                this.isRunning = false;
                this.chrome = null;
                console.log('✅ Chrome shutdown complete');
            } catch (error) {
                console.log('⚠️ Error shutting down Chrome:', error.message);
            }
        }
    }
}

module.exports = new ChromeManager();