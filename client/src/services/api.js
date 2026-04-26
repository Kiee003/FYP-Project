import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 120000
});

export const testConnection = async () => {
    try {
        const response = await API.get('/api/test');
        console.log('✅ Backend connected:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        throw error;
    }
};

export const runAudit = async (url) => {
    try {
        console.log('📤 Sending audit request for:', url);
        
        let auditUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            auditUrl = 'https://' + url;
            console.log('🔧 Added https://, now:', auditUrl);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);
        
        const response = await API.post('/api/audit', { 
            url: auditUrl 
        }, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('✅ Audit complete:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Audit failed:', error.response?.data || error.message);
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            throw new Error('Audit took too long. Complex websites may need more time. Please try again.');
        }
        throw error;
    }
};

// NEW: Get trend data for a URL
export const getTrendData = async (url, limit = 10) => {
    try {
        const response = await API.get(`/api/trend/${encodeURIComponent(url)}?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch trend data:', error);
        throw error;
    }
};

// NEW: Get audit history for a URL
export const getAuditHistory = async (url, limit = 20) => {
    try {
        const response = await API.get(`/api/history/${encodeURIComponent(url)}?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch audit history:', error);
        throw error;
    }
};

// NEW: Get all audits
export const getAllAudits = async (limit = 50) => {
    try {
        const response = await API.get(`/api/audits?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch all audits:', error);
        throw error;
    }
};

// NEW: Get website statistics
export const getWebsiteStats = async (url) => {
    try {
        const response = await API.get(`/api/website/${encodeURIComponent(url)}/stats`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch website stats:', error);
        throw error;
    }
};

// NEW: Get all websites
export const getAllWebsites = async () => {
    try {
        const response = await API.get('/api/websites');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch websites:', error);
        throw error;
    }
};

// NEW: Get statistics
export const getStatistics = async () => {
    try {
        const response = await API.get('/api/statistics');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch statistics:', error);
        throw error;
    }
};

// NEW: Compare audits
export const compareAudits = async (auditIds) => {
    try {
        const response = await API.post('/api/compare', { auditIds });
        return response.data;
    } catch (error) {
        console.error('Failed to compare audits:', error);
        throw error;
    }
};

// NEW: Crawl URL for hyperlinks
export const crawlUrl = async (url) => {
    try {
        const response = await API.post('/api/crawl/analyze', { url });
        return response.data;
    } catch (error) {
        console.error('Failed to crawl URL:', error);
        throw error;
    }
};

// NEW: Get single audit by ID
export const getAuditById = async (id) => {
    try {
        const response = await API.get(`/api/audit/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch audit:', error);
        throw error;
    }
};

export default API;