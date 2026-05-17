const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const database = require('../database');
const { verifyToken, requireMinRole, requireRole, signToken } = require('../authMiddleware');

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Username, email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existing = database.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // First registered user becomes admin
        const userCount = database.getUserCount();
        const role = userCount === 0 ? 'admin' : 'normal';

        const userId = database.createUser(username, email, passwordHash, role);
        const user = database.getUserById(userId);

        const token = signToken(user);

        console.log(`✅ New user registered: ${email} (role: ${role})`);

        res.status(201).json({
            success: true,
            message: role === 'admin'
                ? 'Admin account created — you are the first user!'
                : 'Account created successfully',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('❌ Register error:', error.message);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const user = database.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        database.updateLastLogin(user.id);
        const token = signToken(user);

        console.log(`✅ User logged in: ${email} (role: ${user.role})`);

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
    const user = database.getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
});

// ─── LIST ALL USERS (moderator+) ─────────────────────────────────────────────
// GET /api/auth/users
router.get('/users', verifyToken, requireMinRole('moderator'), (req, res) => {
    try {
        const users = database.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// ─── CHANGE USER ROLE (admin only) ───────────────────────────────────────────
// PUT /api/auth/users/:id/role
router.put('/users/:id/role', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['normal', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role. Use: normal, moderator, admin' });
        }

        // Prevent admin from changing their own role
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot change your own role' });
        }

        const updated = database.updateUserRole(parseInt(id), role);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        console.log(`✅ Admin ${req.user.email} changed user ${id} role to ${role}`);
        res.json({ success: true, message: `User role updated to ${role}` });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update role' });
    }
});

// ─── DELETE USER (admin only) ─────────────────────────────────────────────────
// DELETE /api/auth/users/:id
router.delete('/users/:id', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
        }

        const deleted = database.deleteUser(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        console.log(`✅ Admin ${req.user.email} deleted user ${id}`);
        res.json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// ─── SERVER STATISTICS (admin only) ──────────────────────────────────────────
// GET /api/auth/stats
router.get('/stats', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const stats = database.getStatistics();
        const userCount = database.getUserCount();
        res.json({
            success: true,
            stats: { ...stats, registered_users: userCount }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
