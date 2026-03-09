import axios from 'axios';

// Create a connection to your backend
const API = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 10000
});

// Test function
export const testConnection = async () => {
    try {
        const response = await API.get('/api/test');
        console.log('Backend response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Connection failed:', error.message);
        throw error;
    }
};

export default API;