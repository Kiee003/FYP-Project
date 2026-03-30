const express = require('express');
const router = express.Router();
const lighthouseService = require('../lighthouseService');
const auditQueue = require('../auditQueue'); // Add this

// Simple URL validation
function isValidUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

// Add health check endpoint
router.get('/health', async (req, res) => {
    try {
        const health = await lighthouseService.healthCheck();
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.json({
            success: false,
            data: { status: 'unhealthy', message: error.message }
        });
    }
});

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
        
        // Add to queue instead of running immediately
        const results = await auditQueue.add(url, async (auditUrl) => {
            return await lighthouseService.runAudit(auditUrl);
        });
        
        console.log('📤 Sending results to client');
        console.log('📤 Performance score:', results.scores.performance);
        
        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to run performance audit'
        });
    }
});

module.exports = router;