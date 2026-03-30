import axios from 'axios';

// Create a connection to your backend
const API = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 120000 // Increased to 120 seconds (2 minutes) for complex sites
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

// Run Lighthouse audit function with better error handling
export const runAudit = async (url) => {
    try {
        console.log('📤 Sending audit request for:', url);
        
        // Make sure URL has protocol
        let auditUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            auditUrl = 'https://' + url;
            console.log('🔧 Added https://, now:', auditUrl);
        }
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
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
        
        // Provide more helpful error messages
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            throw new Error('Audit took too long. Complex websites may need more time. Please try again.');
        }
        throw error;
    }
};

export default API;