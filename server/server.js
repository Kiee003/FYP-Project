const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Create Express app
const app = express();

// Define port
const PORT = 5000;

// Use middleware
app.use(cors());
app.use(express.json());

// Create a simple route
app.get('/', (req, res) => {
    res.json({ message: 'Hello from your server!' });
});

// Create a test route
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is working!',
        time: new Date().toLocaleString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log('=================================');
    console.log('SERVER STARTED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`Listen on: http://localhost:${PORT}`);
    console.log(`Test URL: http://localhost:${PORT}/api/test`);
    console.log('=================================');
    console.log('Press Ctrl+C to stop the server');
});