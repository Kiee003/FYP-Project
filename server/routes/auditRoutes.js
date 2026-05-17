const express = require('express');
const router = express.Router();
const lighthouseService = require('../lighthouseService');
const auditQueue = require('../auditQueue');
const database = require('../database');
const { verifyToken, requireMinRole } = require('../authMiddleware');

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
// MAIN AUDIT ENDPOINT — all authenticated users
// ============================================
router.post('/audit', verifyToken, async (req, res) => {
    console.log('📨 ========================================');
    console.log('📨 Received audit request');
    console.log('📨 URL:', req.body.url);
    console.log('📨 User:', req.user.email, `(${req.user.role})`);
    console.log('📨 ========================================');

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        if (!isValidUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL. Must start with http:// or https://'
            });
        }

        console.log('✅ URL validated:', url);

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000);
        });

        const auditPromise = auditQueue.add(url, async (auditUrl) => {
            return await lighthouseService.runAudit(auditUrl);
        });

        const results = await Promise.race([auditPromise, timeoutPromise]);

        if (results && results.scores && results.scores.performance > 0) {
            try {
                // Pass the logged-in user's ID so history is linked to them
                database.saveAudit(results, req.user.id);
                console.log(`💾 Audit saved for user: ${req.user.email}`);
            } catch (dbError) {
                console.log('⚠️ Database save failed:', dbError.message);
            }
        }

        console.log('📤 Sending results to client');
        res.json({ success: true, data: results });

    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        if (error.message.includes('timeout')) {
            res.status(504).json({
                success: false,
                error: 'The audit took too long to complete. Please try again later.'
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
// HISTORY — normal users see own audits only,
//           moderator/admin see all
// ============================================
router.get('/history/:url', verifyToken, async (req, res) => {
    try {
        const { url } = req.params;
        const limit = req.query.limit || 10;
        const decodedUrl = decodeURIComponent(url);

        // Normal users only see their own history
        const userId = req.user.role === 'normal' ? req.user.id : null;
        const history = database.getAuditHistory(decodedUrl, parseInt(limit), userId);

        res.json({ success: true, data: history, count: history.length });
    } catch (error) {
        console.error('❌ Failed to fetch history:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ALL AUDITS (global) — moderator+ only
// ============================================
router.get('/audits', verifyToken, requireMinRole('moderator'), async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const audits = database.getAllAudits(parseInt(limit));
        res.json({ success: true, data: audits, count: audits.length });
    } catch (error) {
        console.error('❌ Failed to fetch audits:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// WEBSITE STATS — all authenticated users
// ============================================
router.get('/website/:url/stats', verifyToken, async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.url);
        const stats = database.getWebsiteStats(decodedUrl);

        if (!stats) {
            return res.json({ success: true, data: null, message: 'No audits found for this website' });
        }
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ Failed to fetch website stats:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ALL WEBSITES — moderator+ only
// ============================================
router.get('/websites', verifyToken, requireMinRole('moderator'), async (req, res) => {
    try {
        const websites = database.getAllWebsites();
        res.json({ success: true, data: websites, count: websites.length });
    } catch (error) {
        console.error('❌ Failed to fetch websites:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// STATISTICS — admin only
// ============================================
router.get('/statistics', verifyToken, requireMinRole('admin'), async (req, res) => {
    try {
        const stats = database.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('❌ Failed to fetch statistics:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE AUDIT — moderator+ only
// ============================================
router.delete('/audit/:id', verifyToken, requireMinRole('moderator'), async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = database.deleteAudit(parseInt(id));

        if (deleted) {
            console.log(`🗑️ Audit ${id} deleted by ${req.user.email} (${req.user.role})`);
            res.json({ success: true, message: `Audit ${id} deleted successfully` });
        } else {
            res.status(404).json({ success: false, error: `Audit ${id} not found` });
        }
    } catch (error) {
        console.error('❌ Failed to delete audit:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TREND DATA — normal sees own, moderator+ sees all
// ============================================
router.get('/trend/:url', verifyToken, async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.url);
        const limit = parseInt(req.query.limit) || 10;

        const userId = req.user.role === 'normal' ? req.user.id : null;
        const history = database.getAuditHistory(decodedUrl, limit, userId);

        const trendData = {
            labels: history.map(audit => {
                const date = new Date(audit.created_at);
                return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            }).reverse(),
            scores: history.map(audit => audit.performance_score).reverse(),
            lcp:    history.map(audit => (audit.lcp / 1000).toFixed(2)).reverse(),
            fcp:    history.map(audit => (audit.fcp / 1000).toFixed(2)).reverse(),
            ttfb:   history.map(audit => (audit.ttfb / 1000).toFixed(2)).reverse(),
            cls:    history.map(audit => audit.cls?.toFixed(3) || 0).reverse(),
            tbt:    history.map(audit => (audit.tbt / 1000).toFixed(2)).reverse(),
        };

        res.json({ success: true, data: trendData, historyCount: history.length });
    } catch (error) {
        console.error('❌ Failed to fetch trend data:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// EXPORT — normal users can export their own audits only,
//          moderator+ can export anything
// ============================================

// Helper: check audit ownership for normal users
function canAccessAudit(audit, user) {
    if (!audit) return false;
    if (user.role !== 'normal') return true; // moderator/admin can access all
    return audit.user_id === user.id;        // normal users: must own it
}

router.get('/export/json/:id', verifyToken, async (req, res) => {
    try {
        const audit = database.db.prepare(`SELECT * FROM audits WHERE id = ?`).get(parseInt(req.params.id));

        if (!audit) return res.status(404).json({ success: false, error: 'Audit not found' });
        if (!canAccessAudit(audit, req.user)) {
            return res.status(403).json({ success: false, error: 'You can only export your own audits' });
        }

        res.json({ success: true, data: audit });
    } catch (error) {
        console.error('❌ Export JSON failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/export/csv/:id', verifyToken, async (req, res) => {
    try {
        const audit = database.db.prepare(`SELECT * FROM audits WHERE id = ?`).get(parseInt(req.params.id));

        if (!audit) return res.status(404).json({ success: false, error: 'Audit not found' });
        if (!canAccessAudit(audit, req.user)) {
            return res.status(403).json({ success: false, error: 'You can only export your own audits' });
        }

        const headers = ['id','url','timestamp','performance_score','lcp(s)','fcp(s)','ttfb(s)','cls','tbt(s)','requests','ai_summary'];
        const row = [
            audit.id, audit.url, audit.created_at, audit.performance_score,
            (audit.lcp / 1000).toFixed(2), (audit.fcp / 1000).toFixed(2),
            (audit.ttfb / 1000).toFixed(2), audit.cls,
            (audit.tbt / 1000).toFixed(2), audit.requests,
            `"${(audit.ai_summary || '').replace(/"/g, '""')}"`
        ];

        const csv = [headers.join(','), row.join(',')].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_${audit.id}_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Export CSV failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/export/url/:url/csv', verifyToken, async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.url);

        // Normal users only export their own; moderator+ export all
        const userId = req.user.role === 'normal' ? req.user.id : null;
        const history = database.getAuditHistory(decodedUrl, 100, userId);

        if (history.length === 0) {
            return res.status(404).json({ success: false, error: 'No audits found' });
        }

        const headers = ['id','timestamp','performance_score','lcp(s)','fcp(s)','ttfb(s)','cls','tbt(s)','requests'];
        const rows = history.map(audit => [
            audit.id, audit.created_at, audit.performance_score,
            (audit.lcp / 1000).toFixed(2), (audit.fcp / 1000).toFixed(2),
            (audit.ttfb / 1000).toFixed(2), audit.cls?.toFixed(3) || 0,
            (audit.tbt / 1000).toFixed(2), audit.requests
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const safeFilename = decodedUrl.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audits_${safeFilename}_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Export URL CSV failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// COMPARISON — all authenticated users
// ============================================
router.post('/compare', verifyToken, async (req, res) => {
    try {
        const { auditIds, urls } = req.body;
        let auditsToCompare = [];

        if (auditIds && auditIds.length >= 2) {
            const placeholders = auditIds.map(() => '?').join(',');
            auditsToCompare = database.db.prepare(`SELECT * FROM audits WHERE id IN (${placeholders})`).all(auditIds);

            // Normal users can only compare their own audits
            if (req.user.role === 'normal') {
                auditsToCompare = auditsToCompare.filter(a => a.user_id === req.user.id);
            }
        } else if (urls && urls.length >= 2) {
            for (const url of urls) {
                const userId = req.user.role === 'normal' ? req.user.id : null;
                const query = userId
                    ? `SELECT * FROM audits WHERE url = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`
                    : `SELECT * FROM audits WHERE url = ? ORDER BY created_at DESC LIMIT 1`;
                const latest = userId
                    ? database.db.prepare(query).get(url, userId)
                    : database.db.prepare(query).get(url);
                if (latest) auditsToCompare.push(latest);
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'Provide either auditIds or urls with at least 2 items'
            });
        }

        if (auditsToCompare.length < 2) {
            return res.status(404).json({ success: false, error: 'Not enough audits found for comparison' });
        }

        const comparison = {
            items: auditsToCompare.map(audit => ({
                id: audit.id, url: audit.url, timestamp: audit.created_at,
                performance_score: audit.performance_score,
                lcp:  (audit.lcp / 1000).toFixed(2),
                fcp:  (audit.fcp / 1000).toFixed(2),
                ttfb: (audit.ttfb / 1000).toFixed(2),
                cls:  audit.cls?.toFixed(3) || 0,
                tbt:  (audit.tbt / 1000).toFixed(2),
                requests: audit.requests
            })),
            summary: {
                bestPerformance: auditsToCompare.reduce((best, curr) =>
                    curr.performance_score > best.performance_score ? curr : best).url,
                bestLcp: auditsToCompare.reduce((best, curr) =>
                    curr.lcp < best.lcp ? curr : best).url
            }
        };

        res.json({ success: true, data: comparison });
    } catch (error) {
        console.error('❌ Comparison failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CRAWLER — all authenticated users
// ============================================
router.post('/crawl/analyze', verifyToken, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

        console.log(`🕷️ Crawling URL: ${url} (user: ${req.user.email})`);

        const fetch = (await import('node-fetch')).default;
        const { JSDOM } = require('jsdom');

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 30000
        });

        if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const links = [];
        for (const anchor of document.querySelectorAll('a[href]')) {
            const href = anchor.getAttribute('href');
            const text = anchor.textContent?.trim() || '';
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                let absoluteUrl = href;
                try { absoluteUrl = new URL(href, url).href; } catch {}
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
            try {
                const targetResponse = await fetch(targetLinks[0].url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 30000
                });
                if (targetResponse.ok) {
                    targetPageContent = await targetResponse.text();
                }
            } catch (targetError) {
                console.log(`⚠️ Failed to download target page: ${targetError.message}`);
            }
        }

        res.json({
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
        });
    } catch (error) {
        console.error('❌ Crawler failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET SINGLE AUDIT — ownership check for normal users
// ============================================
router.get('/audit/:id', verifyToken, async (req, res) => {
    try {
        const audit = database.db.prepare(`SELECT * FROM audits WHERE id = ?`).get(parseInt(req.params.id));

        if (!audit) return res.status(404).json({ success: false, error: 'Audit not found' });
        if (!canAccessAudit(audit, req.user)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        res.json({ success: true, data: audit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SYSTEM ENDPOINTS
// ============================================

// Health — public (no auth needed, useful for uptime monitors)
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
        res.status(500).json({ success: false, data: { status: 'unhealthy', message: error.message } });
    }
});

// Queue status — moderator+ only
router.get('/queue/status', verifyToken, requireMinRole('moderator'), (req, res) => {
    try {
        const status = auditQueue.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test — public
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;