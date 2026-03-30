const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');
const deepseekService = require('./deepseekService');

const TEMP_FOLDER = 'D:\\FYP-Project\\temp';

// Ensure temp folder exists
if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    console.log('✅ Created temp folder:', TEMP_FOLDER);
}

process.env.TMPDIR = TEMP_FOLDER;
process.env.TEMP = TEMP_FOLDER;
process.env.TMP = TEMP_FOLDER;

class LighthouseService {
    
    constructor() {
        this.auditCount = 0;
        console.log('🚀 Lighthouse Service initialized');
        this.chromePath = this.findChromePath(); // Find Chrome once
    }

    findChromePath() {
        // Common Chrome paths on Windows
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const chromePath of possiblePaths) {
            try {
                if (fs.existsSync(chromePath)) {
                    console.log('✅ Found Chrome at:', chromePath);
                    return chromePath;
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        console.log('⚠️ Chrome path not found, using system default');
        return undefined;
    }

    async runAudit(url) {
        this.auditCount++;
        console.log(`\n🔍 [Audit #${this.auditCount}] Starting Lighthouse audit for: ${url}`);
        
        let chrome = null;
        
        try {
            // Launch Chrome with explicit path if found
            console.log('🚀 Launching Chrome...');
            chrome = await chromeLauncher.launch({
                chromePath: this.chromePath,
                chromeFlags: [
                    '--headless=new',
                    '--no-sandbox',
                    '--disable-gpu'
                ]
            });
            
            console.log(`✅ Chrome launched on port: ${chrome.port}`);

            const options = {
                port: chrome.port,
                onlyCategories: ['performance'],
                logLevel: 'error',
                maxWaitForLoad: 30000
            };

            console.log('📊 Running Lighthouse audit...');
            const runnerResult = await lighthouse(url, options);
            
            if (!runnerResult || !runnerResult.lhr) {
                throw new Error('Lighthouse returned invalid result');
            }
            
            console.log('✅ Lighthouse audit complete!');

            const report = runnerResult.lhr;
            const audits = report.audits || {};

            // Better metric extraction with fallbacks
            const metrics = {
                url: report.finalDisplayedUrl || url,
                timestamp: report.fetchTime || new Date().toISOString(),
                scores: {
                    performance: Math.round((report.categories?.performance?.score || 0) * 100)
                },
                metrics: {
                    lcp: audits['largest-contentful-paint']?.numericValue || 0,
                    fcp: audits['first-contentful-paint']?.numericValue || 0,
                    ttfb: (() => {
                        const ttfb = audits['time-to-first-byte']?.numericValue;
                        return ttfb && ttfb > 0 ? ttfb : 0;
                    })(),
                    cls: audits['cumulative-layout-shift']?.numericValue || 0,
                    tbt: audits['total-blocking-time']?.numericValue || 0
                },
                requests: {
                    total: audits['network-requests']?.details?.items?.length || 0
                }
            };

            // Generate AI insights (with timeout to prevent hanging)
            console.log('🤖 Calling DeepSeek AI for insights...');
            const aiPromise = deepseekService.generateInsights(metrics, url);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AI timeout')), 30000)
            );
            
            try {
                const aiInsights = await Promise.race([aiPromise, timeoutPromise]);
                metrics.aiInsights = aiInsights;
            } catch (aiError) {
                console.log('⚠️ AI insights timeout or error, using fallback');
                metrics.aiInsights = {
                    summary: 'AI analysis temporarily unavailable.',
                    recommendations: [{
                        issue: 'Service Unavailable',
                        severity: 'info',
                        networkFactor: 'AI service timeout',
                        suggestion: 'Try again later or continue with metrics'
                    }],
                    generatedAt: new Date().toISOString(),
                    note: 'Fallback due to timeout'
                };
            }
            
            console.log('✅ Audit completed successfully');
            return metrics;

        } catch (error) {
            console.error('❌ Lighthouse audit failed:', error.message);
            
            return {
                url,
                timestamp: new Date().toISOString(),
                scores: { performance: 0 },
                metrics: { lcp: 0, fcp: 0, ttfb: 0, cls: 0, tbt: 0 },
                requests: { total: 0 },
                aiInsights: {
                    summary: `Audit failed: ${error.message}`,
                    recommendations: [{
                        issue: 'Audit Failed',
                        severity: 'critical',
                        networkFactor: 'Technical issue',
                        suggestion: 'Please check if Chrome is installed and try again.'
                    }],
                    generatedAt: new Date().toISOString()
                }
            };
            
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
