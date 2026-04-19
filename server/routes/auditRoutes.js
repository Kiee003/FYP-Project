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
// SYSTEM ENDPOINTS
// ============================================

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Test database connection
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
            data: { 
                status: 'unhealthy', 
                message: error.message 
            }
        });
    }
});

// Queue status endpoint
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

// Test endpoint (simple connectivity test)
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
            queue: 'GET /api/queue/status'
        }
    });
});

module.exports = router;