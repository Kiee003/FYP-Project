const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import routes
const auditRoutes = require('./routes/auditRoutes');

// Create Express app
const app = express();

// Define port from env or default to 5000
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Web Performance Dashboard API',
        version: '1.0.0',
        endpoints: {
            test: '/api/test',
            audit: '/api/audit (POST with {url: "https://example.com"})'
        }
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is working!',
        time: new Date().toLocaleString()
    });
});

// Use audit routes
app.use('/api', auditRoutes);

// Start server
app.listen(PORT, () => {
    console.log('=================================');
    console.log('SERVER STARTED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`Listen on: http://localhost:${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/api/test`);
    console.log(`Audit URL: POST to http://localhost:${PORT}/api/audit`);
    console.log('=================================');
    console.log('📝 To test audit:');
    console.log('   Use Postman or curl:');
    console.log('   curl -X POST http://localhost:${PORT}/api/audit \\');
    console.log('   -H "Content-Type: application/json" \\');
    console.log('   -d "{\\"url\\":\\"https://example.com\\"}"');
    console.log('=================================');
    console.log('Press Ctrl+C to stop the server');
});