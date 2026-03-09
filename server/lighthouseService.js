const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class LighthouseService {
    async runAudit(url) {
        console.log(`🔍 Starting Lighthouse audit for: ${url}`);
        
        let chrome = null;
        
        try {
            // Launch Chrome
            console.log('🚀 Launching Chrome...');
            chrome = await chromeLauncher.launch({
                chromeFlags: [
                    '--headless',
                    '--no-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage'
                ]
            });

            // Lighthouse options
            const options = {
                logLevel: 'error',
                output: 'json',
                port: chrome.port,
                onlyCategories: ['performance'],
                throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1
                }
            };

            console.log('📊 Running performance audit...');
            
            // Run Lighthouse
            const runnerResult = await lighthouse(url, options);
            const report = runnerResult.lhr;

            console.log('✅ Audit complete!');

            // Extract only what we need
            const audits = report.audits;
            
            const results = {
                url: report.finalDisplayedUrl,
                timestamp: report.fetchTime,
                scores: {
                    performance: report.categories.performance.score * 100
                },
                metrics: {
                    // Core Web Vitals
                    lcp: audits['largest-contentful-paint']?.numericValue,
                    fcp: audits['first-contentful-paint']?.numericValue,
                    ttfb: audits['time-to-first-byte']?.numericValue,
                    cls: audits['cumulative-layout-shift']?.numericValue,
                    tbt: audits['total-blocking-time']?.numericValue,
                    
                    // Additional metrics
                    serverResponseTime: audits['server-response-time']?.numericValue,
                    domSize: audits['dom-size']?.numericValue
                },
                requests: {
                    total: audits['network-requests']?.details?.items?.length || 0
                }
            };

            return results;

        } catch (error) {
            console.error('❌ Lighthouse audit failed:', error.message);
            throw error;
        } finally {
            // Always close Chrome
            if (chrome) {
                await chrome.kill();
                console.log('👋 Chrome closed');
            }
        }
    }
}

// Export a single instance
module.exports = new LighthouseService();