const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ Created database directory:', dbDir);
}

const dbPath = path.join(dbDir, 'audit_history.db');
console.log('📁 Database path:', dbPath);

const db = new Database(dbPath);
console.log('✅ Connected to SQLite database');

function initializeDatabase() {
    // Audits table
    db.exec(`
        CREATE TABLE IF NOT EXISTS audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            performance_score INTEGER,
            lcp REAL,
            fcp REAL,
            ttfb REAL,
            cls REAL,
            tbt REAL,
            requests INTEGER,
            ai_summary TEXT,
            ai_recommendations TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER REFERENCES users(id)
        )
    `);

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Websites table
    db.exec(`
        CREATE TABLE IF NOT EXISTS websites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE NOT NULL,
            first_audit DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_audit DATETIME DEFAULT CURRENT_TIMESTAMP,
            avg_score REAL,
            best_score INTEGER,
            worst_score INTEGER,
            audit_count INTEGER DEFAULT 1
        )
    `);

    // Migration: add user_id to existing audits table if not present
    try {
        db.exec(`ALTER TABLE audits ADD COLUMN user_id INTEGER REFERENCES users(id)`);
        console.log('✅ Migrated audits table: added user_id column');
    } catch (e) {
        // Column already exists — safe to ignore
    }

    db.exec(`CREATE INDEX IF NOT EXISTS idx_url ON audits(url)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON audits(timestamp)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_id ON audits(user_id)`);

    console.log('✅ Database tables and indexes ready');
}

initializeDatabase();

// ─── AUDIT FUNCTIONS ──────────────────────────────────────────────────────────

const saveAudit = (auditData, userId = null) => {
    const { url, scores, metrics, requests, aiInsights } = auditData;

    const aiSummary = aiInsights?.summary || '';
    const aiRecommendations = aiInsights?.recommendations
        ? JSON.stringify(aiInsights.recommendations)
        : '';

    const info = db.prepare(`
        INSERT INTO audits (
            url, performance_score, lcp, fcp, ttfb, cls, tbt, requests,
            ai_summary, ai_recommendations, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        url,
        scores.performance,
        metrics.lcp,
        metrics.fcp,
        metrics.ttfb,
        metrics.cls,
        metrics.tbt,
        requests.total,
        aiSummary,
        aiRecommendations,
        new Date().toISOString(),
        userId
    );

    console.log(`💾 Audit saved with ID: ${info.lastInsertRowid} (user: ${userId || 'anonymous'})`);
    updateWebsiteStats(url, scores.performance);
};

const updateWebsiteStats = (url, score) => {
    const website = db.prepare(`SELECT * FROM websites WHERE url = ?`).get(url);

    if (website) {
        const newCount = website.audit_count + 1;
        const newAvg = ((website.avg_score * website.audit_count) + score) / newCount;
        db.prepare(`
            UPDATE websites
            SET last_audit = ?, avg_score = ?, best_score = ?, worst_score = ?, audit_count = ?
            WHERE url = ?
        `).run(
            new Date().toISOString(),
            newAvg,
            Math.max(website.best_score, score),
            Math.min(website.worst_score, score),
            newCount,
            url
        );
    } else {
        db.prepare(`
            INSERT INTO websites (url, first_audit, last_audit, avg_score, best_score, worst_score, audit_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(url, new Date().toISOString(), new Date().toISOString(), score, score, score, 1);
    }
};

// Get history for a URL — optionally filter by user (for normal users)
const getAuditHistory = (url, limit = 10, userId = null) => {
    if (userId) {
        return db.prepare(`
            SELECT * FROM audits WHERE url = ? AND user_id = ?
            ORDER BY created_at DESC LIMIT ?
        `).all(url, userId, limit);
    }
    return db.prepare(`
        SELECT * FROM audits WHERE url = ?
        ORDER BY created_at DESC LIMIT ?
    `).all(url, limit);
};

// Get all audits — moderator/admin only
const getAllAudits = (limit = 50) => {
    return db.prepare(`
        SELECT a.*, u.username, u.email FROM audits a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT ?
    `).all(limit);
};

const getWebsiteStats = (url) => db.prepare(`SELECT * FROM websites WHERE url = ?`).get(url);

const getAllWebsites = () => db.prepare(`
    SELECT url, first_audit, last_audit, avg_score, best_score, worst_score, audit_count
    FROM websites ORDER BY last_audit DESC
`).all();

const deleteAudit = (id) => {
    const info = db.prepare(`DELETE FROM audits WHERE id = ?`).run(id);
    return info.changes > 0;
};

const getStatistics = () => db.prepare(`
    SELECT
        COUNT(*) as total_audits,
        COUNT(DISTINCT url) as total_websites,
        COUNT(DISTINCT user_id) as total_users,
        AVG(performance_score) as avg_performance,
        MIN(performance_score) as min_score,
        MAX(performance_score) as max_score
    FROM audits
`).get();

// ─── USER FUNCTIONS ───────────────────────────────────────────────────────────

const createUser = (username, email, passwordHash, role = 'normal') => {
    const info = db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `).run(username, email, passwordHash, role);
    return info.lastInsertRowid;
};

const getUserByEmail = (email) =>
    db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);

const getUserById = (id) =>
    db.prepare(`SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?`).get(id);

const getAllUsers = () =>
    db.prepare(`
        SELECT u.id, u.username, u.email, u.role, u.created_at, u.last_login,
               COUNT(a.id) as audit_count
        FROM users u
        LEFT JOIN audits a ON u.id = a.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `).all();

const updateUserRole = (id, role) => {
    const info = db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, id);
    return info.changes > 0;
};

const deleteUser = (id) => {
    const info = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    return info.changes > 0;
};

const updateLastLogin = (id) =>
    db.prepare(`UPDATE users SET last_login = ? WHERE id = ?`).run(new Date().toISOString(), id);

const getUserCount = () =>
    db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;

const closeDatabase = () => {
    db.close();
    console.log('👋 Database connection closed');
};

module.exports = {
    // Audit
    saveAudit,
    getAuditHistory,
    getAllAudits,
    getWebsiteStats,
    getAllWebsites,
    deleteAudit,
    getStatistics,
    // Users
    createUser,
    getUserByEmail,
    getUserById,
    getAllUsers,
    updateUserRole,
    deleteUser,
    updateLastLogin,
    getUserCount,
    // Misc
    closeDatabase,
    db
};