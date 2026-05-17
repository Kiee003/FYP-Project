const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const database = require('./database');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const auditRoutes = require('./routes/auditRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.json({
        message: 'Web Performance Dashboard API',
        version: '2.0.0',
        endpoints: {
            auth: '/api/auth/login, /api/auth/register',
            audit: '/api/audit (POST, requires auth)',
            test: '/api/test'
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'success', message: 'Server is working!', time: new Date().toLocaleString() });
});

// ─── AUTH ROUTES (public — login/register don't need a token) ─────────────────
app.use('/api/auth', authRoutes);

// ─── PROTECTED ROUTES (all audit routes require a valid token) ────────────────
// NOTE: Open auditRoutes.js and add the following at the top of each route handler:
//
//   const { verifyToken, requireMinRole } = require('../authMiddleware');
//
// Then protect routes like this:
//   router.post('/audit', verifyToken, async (req, res) => { ... })
//   router.get('/history', verifyToken, async (req, res) => { ... })
//   router.delete('/audit/:id', verifyToken, requireMinRole('moderator'), async (req, res) => { ... })
//
// And pass req.user.id when saving audits:
//   database.saveAudit(auditData, req.user.id);
//
// For history, pass req.user.id for normal users, null for moderator/admin (to see all):
//   const userId = req.user.role === 'normal' ? req.user.id : null;
//   database.getAuditHistory(url, 10, userId);

app.use('/api', auditRoutes);

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────

const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    database.closeDatabase();
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const server = app.listen(PORT, () => {
    console.log('=================================');
    console.log('SERVER STARTED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`Listening on: http://localhost:${PORT}`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/login`);
    console.log('=================================');
});