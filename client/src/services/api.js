import axios from 'axios';

// Create a connection to your backend
const API = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 30000 // 30 seconds for Lighthouse audit
});

// Test connection
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

// Run Lighthouse audit
export const runAudit = async (url) => {
    try {
        console.log('📤 Sending audit request for:', url);
        
        const response = await API.post('/api/audit', { url });
        
        console.log('✅ Audit complete:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Audit failed:', error.response?.data || error.message);
        throw error;
    }
};

export default API;