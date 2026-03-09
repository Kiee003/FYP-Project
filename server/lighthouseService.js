const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// USE YOUR ACTUAL FOLDER NAME: 'temp'
const TEMP_FOLDER = 'D:\\FYP-Project\\temp';

// Ensure temp folder exists
if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    console.log('✅ Created temp folder:', TEMP_FOLDER);
}

// Override system temp folder
process.env.TMPDIR = TEMP_FOLDER;
process.env.TEMP = TEMP_FOLDER;
process.env.TMP = TEMP_FOLDER;

class LighthouseService {
    async runAudit(url) {
        console.log(`🔍 Starting Lighthouse audit for: ${url}`);
        console.log(`📁 Using temp folder: ${TEMP_FOLDER}`);
        
        let chrome = null;
        
        try {
            chrome = await chromeLauncher.launch({
                chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
            });
            
            console.log(`✅ Chrome launched on port: ${chrome.port}`);

            const options = {
                port: chrome.port,
                onlyCategories: ['performance'],
                logLevel: 'error'
            };

            console.log('📊 Running Lighthouse audit...');
            const runnerResult = await lighthouse(url, options);
            console.log('✅ Lighthouse audit complete!');

            const report = runnerResult.lhr;
            const audits = report.audits || {};

            const results = {
                url: report.finalDisplayedUrl || url,
                timestamp: report.fetchTime || new Date().toISOString(),
                scores: {
                    performance: Math.round((report.categories?.performance?.score || 0) * 100)
                },
                metrics: {
                    lcp: audits['largest-contentful-paint']?.numericValue || 0,
                    fcp: audits['first-contentful-paint']?.numericValue || 0,
                    ttfb: audits['time-to-first-byte']?.numericValue || 0,
                    cls: audits['cumulative-layout-shift']?.numericValue || 0,
                    tbt: audits['total-blocking-time']?.numericValue || 0
                },
                requests: {
                    total: audits['network-requests']?.details?.items?.length || 0
                }
            };

            return results;

        } catch (error) {
            console.error('❌ Lighthouse audit failed:', error);
            throw error;
        } finally {
            if (chrome) {
                try {
                    await chrome.kill();
                    console.log('👋 Chrome closed');
                } catch (e) {
                    console.log('⚠️ Error closing Chrome:', e.message);
                }
            }
        }
    }
}

module.exports = new LighthouseService();