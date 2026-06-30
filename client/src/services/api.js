import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000', // --> For Windows users, use this if you are running the backend locally on Windows
    // baseURL: 'http://192.168.0.31:5000', //--> For Linux users, use this if you are running the backend locally on Linux
    timeout: 120000
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If token expires mid-session, clear it and reload to show login page
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

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

        const response = await API.post('/api/audit', { url: auditUrl }, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('✅ Audit complete:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Audit failed:', error.response?.data || error.message);
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            throw new Error('Audit took too long. Please try again.');
        }
        throw error;
    }
};

export const getTrendData = async (url, limit = 10) => {
    const response = await API.get(`/api/trend/${encodeURIComponent(url)}?limit=${limit}`);
    return response.data;
};

export const getAuditHistory = async (url, limit = 20) => {
    const response = await API.get(`/api/history/${encodeURIComponent(url)}?limit=${limit}`);
    return response.data;
};

export const getAllAudits = async (limit = 50) => {
    const response = await API.get(`/api/audits?limit=${limit}`);
    return response.data;
};

export const getWebsiteStats = async (url) => {
    const response = await API.get(`/api/website/${encodeURIComponent(url)}/stats`);
    return response.data;
};

export const getAllWebsites = async () => {
    const response = await API.get('/api/websites');
    return response.data;
};

export const getStatistics = async () => {
    const response = await API.get('/api/statistics');
    return response.data;
};

export const compareAudits = async (auditIds) => {
    const response = await API.post('/api/compare', { auditIds });
    return response.data;
};

export const crawlUrl = async (url) => {
    const response = await API.post('/api/crawl/analyze', { url });
    return response.data;
};

export const getAuditById = async (id) => {
    const response = await API.get(`/api/audit/${id}`);
    return response.data;
};

export default API;