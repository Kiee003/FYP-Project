import axios from 'axios';

// Create a connection to your backend
const API = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 30000 // Increased timeout for Lighthouse audits (30 seconds)
});

// Test connection function
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

// NEW: Run Lighthouse audit function
export const runAudit = async (url) => {
    try {
        console.log('📤 Sending audit request for:', url);
        
        // Make sure URL has protocol
        let auditUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            auditUrl = 'https://' + url;
            console.log('🔧 Added https://, now:', auditUrl);
        }
        
        const response = await API.post('/api/audit', { 
            url: auditUrl 
        });
        
        console.log('✅ Audit complete:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Audit failed:', error.response?.data || error.message);
        throw error;
    }
};

export default API;