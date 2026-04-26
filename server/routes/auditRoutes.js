const express = require('express');
const router = express.Router();
const lighthouseService = require('../lighthouseService');
const auditQueue = require('../auditQueue');
const database = require('../database');

// Simple URL validation
function isValidUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

// ============================================
// MAIN AUDIT ENDPOINT
// ============================================
router.post('/audit', async (req, res) => {
    console.log('📨 ========================================');
    console.log('📨 Received audit request');
    console.log('📨 URL:', req.body.url);
    console.log('📨 ========================================');
    
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL is required' 
            });
        }

        if (!isValidUrl(url)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid URL. Must start with http:// or https://' 
            });
        }

        console.log('✅ URL validated:', url);
        
        // Set a timeout for the entire request
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000);
        });

        // Add to queue instead of running immediately
        const auditPromise = auditQueue.add(url, async (auditUrl) => {
            return await lighthouseService.runAudit(auditUrl);
        });

        // Race between audit and timeout
        const results = await Promise.race([auditPromise, timeoutPromise]);
        
        // Save to database (synchronous with better-sqlite3)
        if (results && results.scores && results.scores.performance > 0) {
            try {
                database.saveAudit(results);
                console.log('💾 Audit saved to database successfully');
            } catch (dbError) {
                console.log('⚠️ Database save failed:', dbError.message);
                // Don't fail the request if database save fails
            }
        }
        
        console.log('📤 Sending results to client');
        console.log('📤 Performance score:', results.scores.performance);
        
        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        
        // Send appropriate error response
        if (error.message.includes('timeout')) {
            res.status(504).json({ 
                success: false, 
                error: 'The audit took too long to complete. Please try a simpler URL or try again later.'
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: error.message || 'Failed to run performance audit'
            });
        }
    }
});

// ============================================
// DATABASE ENDPOINTS
// ============================================

// Get audit history for a specific URL
router.get('/history/:url', async (req, res) => {
    try {
        const { url } = req.params;
        const limit = req.query.limit || 10;
        const decodedUrl = decodeURIComponent(url);
        
        const history = database.getAuditHistory(decodedUrl, parseInt(limit));
        
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error) {
        console.error('❌ Failed to fetch history:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all audits (global history)
router.get('/audits', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const audits = database.getAllAudits(parseInt(limit));
        
        res.json({
            success: true,
            data: audits,
            count: audits.length
        });
    } catch (error) {
        console.error('❌ Failed to fetch audits:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get statistics for a specific website
router.get('/website/:url/stats', async (req, res) => {
    try {
        const { url } = req.params;
        const decodedUrl = decodeURIComponent(url);
        const stats = database.getWebsiteStats(decodedUrl);
        
        if (!stats) {
            return res.json({
                success: true,
                data: null,
                message: 'No audits found for this website'
            });
        }
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Failed to fetch website stats:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all websites summary
router.get('/websites', async (req, res) => {
    try {
        const websites = database.getAllWebsites();
        
        res.json({
            success: true,
            data: websites,
            count: websites.length
        });
    } catch (error) {
        console.error('❌ Failed to fetch websites:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get global statistics
router.get('/statistics', async (req, res) => {
    try {
        const stats = database.getStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Failed to fetch statistics:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete an audit by ID (for maintenance)
router.delete('/audit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = database.deleteAudit(parseInt(id));
        
        if (deleted) {
            res.json({
                success: true,
                message: `Audit ${id} deleted successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                error: `Audit ${id} not found`
            });
        }
    } catch (error) {
        console.error('❌ Failed to delete audit:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ENHANCEMENT ROUTES FOR PHASE 7
// ============================================

// 1. TREND DATA ENDPOINT (for charts)
router.get('/trend/:url', async (req, res) => {
    try {
        const { url } = req.params;
        const decodedUrl = decodeURIComponent(url);
        const limit = parseInt(req.query.limit) || 10;
        
        const history = database.getAuditHistory(decodedUrl, limit);
        
        // Format data for chart visualization
        const trendData = {
            labels: history.map(audit => {
                const date = new Date(audit.created_at);
                return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            }).reverse(),
            scores: history.map(audit => audit.performance_score).reverse(),
            lcp: history.map(audit => (audit.lcp / 1000).toFixed(2)).reverse(),
            fcp: history.map(audit => (audit.fcp / 1000).toFixed(2)).reverse(),
            ttfb: history.map(audit => (audit.ttfb / 1000).toFixed(2)).reverse(),
            cls: history.map(audit => audit.cls?.toFixed(3) || 0).reverse(),
            tbt: history.map(audit => (audit.tbt / 1000).toFixed(2)).reverse(),
            fetchTime: history.map(audit => audit.timestamp).reverse()
        };
        
        res.json({
            success: true,
            data: trendData,
            historyCount: history.length
        });
    } catch (error) {
        console.error('❌ Failed to fetch trend data:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 2. EXPORT ENDPOINTS (JSON/CSV)
router.get('/export/json/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stmt = database.db.prepare(`SELECT * FROM audits WHERE id = ?`);
        const audit = stmt.get(parseInt(id));
        
        if (!audit) {
            return res.status(404).json({ success: false, error: 'Audit not found' });
        }
        
        res.json({
            success: true,
            data: audit
        });
    } catch (error) {
        console.error('❌ Export JSON failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/export/csv/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stmt = database.db.prepare(`SELECT * FROM audits WHERE id = ?`);
        const audit = stmt.get(parseInt(id));
        
        if (!audit) {
            return res.status(404).json({ success: false, error: 'Audit not found' });
        }
        
        const headers = ['id', 'url', 'timestamp', 'performance_score', 'lcp(s)', 'fcp(s)', 'ttfb(s)', 'cls', 'tbt(s)', 'requests', 'ai_summary'];
        const lcpSec = (audit.lcp / 1000).toFixed(2);
        const fcpSec = (audit.fcp / 1000).toFixed(2);
        const ttfbSec = (audit.ttfb / 1000).toFixed(2);
        const tbtSec = (audit.tbt / 1000).toFixed(2);
        
        const row = [
            audit.id,
            audit.url,
            audit.created_at,
            audit.performance_score,
            lcpSec,
            fcpSec,
            ttfbSec,
            audit.cls,
            tbtSec,
            audit.requests,
            `"${(audit.ai_summary || '').replace(/"/g, '""')}"`
        ];
        
        const csv = [headers.join(','), row.join(',')].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_${id}_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Export CSV failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/export/url/:url/csv', async (req, res) => {
    try {
        const { url } = req.params;
        const decodedUrl = decodeURIComponent(url);
        const history = database.getAuditHistory(decodedUrl, 100);
        
        if (history.length === 0) {
            return res.status(404).json({ success: false, error: 'No audits found' });
        }
        
        const headers = ['id', 'timestamp', 'performance_score', 'lcp(s)', 'fcp(s)', 'ttfb(s)', 'cls', 'tbt(s)', 'requests'];
        const rows = history.map(audit => [
            audit.id,
            audit.created_at,
            audit.performance_score,
            (audit.lcp / 1000).toFixed(2),
            (audit.fcp / 1000).toFixed(2),
            (audit.ttfb / 1000).toFixed(2),
            audit.cls?.toFixed(3) || 0,
            (audit.tbt / 1000).toFixed(2),
            audit.requests
        ]);
        
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        const safeFilename = decodedUrl.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audits_${safeFilename}_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Export URL CSV failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. COMPARISON ENDPOINT
router.post('/compare', async (req, res) => {
    try {
        const { auditIds, urls } = req.body;
        let auditsToCompare = [];
        
        if (auditIds && auditIds.length >= 2) {
            const placeholders = auditIds.map(() => '?').join(',');
            const stmt = database.db.prepare(`SELECT * FROM audits WHERE id IN (${placeholders})`);
            auditsToCompare = stmt.all(auditIds);
        } else if (urls && urls.length >= 2) {
            for (const url of urls) {
                const stmt = database.db.prepare(`SELECT * FROM audits WHERE url = ? ORDER BY created_at DESC LIMIT 1`);
                const latest = stmt.get(url);
                if (latest) auditsToCompare.push(latest);
            }
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Provide either auditIds (array of IDs) or urls (array of URLs) with at least 2 items'
            });
        }
        
        if (auditsToCompare.length < 2) {
            return res.status(404).json({ 
                success: false, 
                error: 'Not enough audits found for comparison'
            });
        }
        
        const comparison = {
            items: auditsToCompare.map(audit => ({
                id: audit.id,
                url: audit.url,
                timestamp: audit.created_at,
                performance_score: audit.performance_score,
                lcp: (audit.lcp / 1000).toFixed(2),
                fcp: (audit.fcp / 1000).toFixed(2),
                ttfb: (audit.ttfb / 1000).toFixed(2),
                cls: audit.cls?.toFixed(3) || 0,
                tbt: (audit.tbt / 1000).toFixed(2),
                requests: audit.requests
            })),
            summary: {
                bestPerformance: auditsToCompare.reduce((best, curr) => 
                    (curr.performance_score > best.performance_score) ? curr : best
                ).url,
                bestLcp: auditsToCompare.reduce((best, curr) => 
                    (curr.lcp < best.lcp) ? curr : best
                ).url
            }
        };
        
        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('❌ Comparison failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. HYPERLINK CRAWLER ENDPOINT
router.post('/crawl/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }
        
        console.log(`🕷️ Crawling URL: ${url}`);
        
        const fetch = (await import('node-fetch')).default;
        const { JSDOM } = require('jsdom');
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status}`);
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const links = [];
        const anchors = document.querySelectorAll('a[href]');
        
        for (const anchor of anchors) {
            const href = anchor.getAttribute('href');
            const text = anchor.textContent?.trim() || '';
            
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                let absoluteUrl = href;
                try {
                    absoluteUrl = new URL(href, url).href;
                } catch (e) {
                    absoluteUrl = href;
                }
                
                links.push({
                    url: absoluteUrl,
                    text: text.substring(0, 100),
                    isInternal: absoluteUrl.includes(new URL(url).hostname)
                });
            }
        }
        
        const targetDomain = 'istudent.uitm.edu.my';
        const targetLinks = links.filter(link => link.url.includes(targetDomain));
        
        let targetPageContent = null;
        
        if (targetLinks.length > 0) {
            const targetUrl = targetLinks[0].url;
            console.log(`🎯 Found target link: ${targetUrl}`);
            
            try {
                const targetResponse = await fetch(targetUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 30000
                });
                
                if (targetResponse.ok) {
                    targetPageContent = await targetResponse.text();
                    console.log(`✅ Downloaded target page (${targetPageContent.length} bytes)`);
                }
            } catch (targetError) {
                console.log(`⚠️ Failed to download target page: ${targetError.message}`);
            }
        }
        
        const result = {
            success: true,
            data: {
                sourceUrl: url,
                sourceHtmlLength: html.length,
                totalLinksFound: links.length,
                internalLinks: links.filter(l => l.isInternal).length,
                externalLinks: links.filter(l => !l.isInternal).length,
                targetDomainLinks: targetLinks.map(l => ({ url: l.url, text: l.text })),
                targetPageContent: targetPageContent ? {
                    length: targetPageContent.length,
                    preview: targetPageContent.substring(0, 2000),
                    fullContent: targetPageContent
                } : null,
                allLinks: links.slice(0, 100)
            }
        };
        
        res.json(result);
    } catch (error) {
        console.error('❌ Crawler failed:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get specific audit by ID
router.get('/audit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stmt = database.db.prepare(`SELECT * FROM audits WHERE id = ?`);
        const audit = stmt.get(parseInt(id));
        
        if (!audit) {
            return res.status(404).json({ success: false, error: 'Audit not found' });
        }
        
        res.json({ success: true, data: audit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SYSTEM ENDPOINTS
// ============================================

router.get('/health', async (req, res) => {
    try {
        const stats = database.getStatistics();
        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'Web Performance Dashboard',
                database: 'connected',
                total_audits: stats?.total_audits || 0,
                total_websites: stats?.total_websites || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: { status: 'unhealthy', message: error.message }
        });
    }
});

router.get('/queue/status', (req, res) => {
    try {
        const status = auditQueue.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        endpoints: {
            audit: 'POST /api/audit',
            history: 'GET /api/history/:url',
            audits: 'GET /api/audits',
            websites: 'GET /api/websites',
            statistics: 'GET /api/statistics',
            health: 'GET /api/health',
            queue: 'GET /api/queue/status',
            trend: 'GET /api/trend/:url',
            compare: 'POST /api/compare',
            crawl: 'POST /api/crawl/analyze'
        }
    });
});

module.exports = router;