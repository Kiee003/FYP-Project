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

// Create database connection (synchronous)
const db = new Database(dbPath);
console.log('✅ Connected to SQLite database');

// Initialize database tables (synchronous)
function initializeDatabase() {
    // Create audits table
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create websites table
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

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_url ON audits(url)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON audits(timestamp)`);
    
    console.log('✅ Database tables and indexes ready');
}

initializeDatabase();

// Save audit result to database (synchronous)
const saveAudit = (auditData) => {
    const { url, scores, metrics, requests, aiInsights } = auditData;
    
    const aiSummary = aiInsights?.summary || '';
    const aiRecommendations = aiInsights?.recommendations ? JSON.stringify(aiInsights.recommendations) : '';
    
    const insertStmt = db.prepare(`
        INSERT INTO audits (
            url, performance_score, lcp, fcp, ttfb, cls, tbt, requests, 
            ai_summary, ai_recommendations, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = insertStmt.run(
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
        new Date().toISOString()
    );
    
    console.log(`💾 Audit saved to database with ID: ${info.lastInsertRowid}`);
    
    // Update website statistics
    updateWebsiteStats(url, scores.performance);
};

// Update website statistics (synchronous)
const updateWebsiteStats = (url, score) => {
    const website = db.prepare(`SELECT * FROM websites WHERE url = ?`).get(url);
    
    if (website) {
        const newCount = website.audit_count + 1;
        const newAvg = ((website.avg_score * website.audit_count) + score) / newCount;
        const newBest = Math.max(website.best_score, score);
        const newWorst = Math.min(website.worst_score, score);
        
        db.prepare(`
            UPDATE websites 
            SET last_audit = ?, avg_score = ?, best_score = ?, worst_score = ?, audit_count = ?
            WHERE url = ?
        `).run(new Date().toISOString(), newAvg, newBest, newWorst, newCount, url);
    } else {
        db.prepare(`
            INSERT INTO websites (url, first_audit, last_audit, avg_score, best_score, worst_score, audit_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(url, new Date().toISOString(), new Date().toISOString(), score, score, score, 1);
    }
};

// Get audit history for a specific URL (synchronous)
const getAuditHistory = (url, limit = 10) => {
    const stmt = db.prepare(`
        SELECT * FROM audits 
        WHERE url = ?
        ORDER BY created_at DESC 
        LIMIT ?
    `);
    return stmt.all(url, limit);
};

// Get all audits (synchronous)
const getAllAudits = (limit = 50) => {
    const stmt = db.prepare(`
        SELECT * FROM audits 
        ORDER BY created_at DESC 
        LIMIT ?
    `);
    return stmt.all(limit);
};

// Get website statistics (synchronous)
const getWebsiteStats = (url) => {
    const stmt = db.prepare(`SELECT * FROM websites WHERE url = ?`);
    return stmt.get(url);
};

// Get all websites summary (synchronous)
const getAllWebsites = () => {
    const stmt = db.prepare(`
        SELECT url, first_audit, last_audit, avg_score, best_score, worst_score, audit_count
        FROM websites 
        ORDER BY last_audit DESC
    `);
    return stmt.all();
};

// Delete audit by ID (synchronous)
const deleteAudit = (id) => {
    const stmt = db.prepare(`DELETE FROM audits WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes > 0;
};

// Get statistics summary (synchronous)
const getStatistics = () => {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total_audits,
            COUNT(DISTINCT url) as total_websites,
            AVG(performance_score) as avg_performance,
            MIN(performance_score) as min_score,
            MAX(performance_score) as max_score
        FROM audits
    `);
    return stmt.get();
};

// Close the database connection (call this when your app shuts down)
const closeDatabase = () => {
    db.close();
    console.log('👋 Database connection closed');
};

module.exports = {
    saveAudit,
    getAuditHistory,
    getAllAudits,
    getWebsiteStats,
    getAllWebsites,
    deleteAudit,
    getStatistics,
    closeDatabase
};