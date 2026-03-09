const express = require('express');
const router = express.Router();
const lighthouseService = require('../lighthouseService');

// Simple validation function
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// POST /api/audit - Run Lighthouse audit
router.post('/audit', async (req, res) => {
    console.log('📨 Received audit request');
    
    try {
        const { url } = req.body;
        
        // Check if URL was provided
        if (!url) {
            console.log('❌ No URL provided');
            return res.status(400).json({ 
                success: false, 
                error: 'URL is required' 
            });
        }

        // Validate URL format
        if (!isValidUrl(url)) {
            console.log('❌ Invalid URL format:', url);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid URL format. Please include http:// or https://' 
            });
        }

        console.log('✅ URL validated:', url);

        // Run the audit
        const results = await lighthouseService.runAudit(url);
        
        // Send results back
        console.log('📤 Sending results to client');
        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('❌ Audit route error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to run performance audit: ' + error.message 
        });
    }
});

module.exports = router;