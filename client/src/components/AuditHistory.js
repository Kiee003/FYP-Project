import React, { useState, useEffect } from 'react';
import './AuditHistory.css';

const AuditHistory = ({ url }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (showHistory && url) {
            fetchHistory();
        }
    }, [showHistory, url]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/history/${encodeURIComponent(url)}`);
            const data = await response.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getScoreColor = (score) => {
        if (score >= 90) return '#28a745';
        if (score >= 50) return '#ffc107';
        return '#dc3545';
    };

    if (!showHistory) {
        return (
            <button 
                className="btn-history"
                onClick={() => setShowHistory(true)}
            >
                📊 View Audit History
            </button>
        );
    }

    return (
        <div className="audit-history">
            <div className="history-header">
                <h3>📈 Audit History for {url}</h3>
                <button 
                    className="btn-close"
                    onClick={() => setShowHistory(false)}
                >
                    ✕
                </button>
            </div>

            {loading && <div className="loading-history">Loading history...</div>}

            {!loading && history.length === 0 && (
                <div className="no-history">No previous audits found for this URL.</div>
            )}

            {!loading && history.length > 0 && (
                <div className="history-list">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Score</th>
                                <th>LCP</th>
                                <th>FCP</th>
                                <th>CLS</th>
                                <th>Requests</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((audit) => (
                                <tr key={audit.id}>
                                    <td>{formatDate(audit.created_at)}</td>
                                    <td>
                                        <span 
                                            className="score-badge"
                                            style={{ backgroundColor: getScoreColor(audit.performance_score) }}
                                        >
                                            {audit.performance_score}
                                        </span>
                                    </td>
                                    <td>{(audit.lcp / 1000).toFixed(2)}s</td>
                                    <td>{(audit.fcp / 1000).toFixed(2)}s</td>
                                    <td>{audit.cls.toFixed(3)}</td>
                                    <td>{audit.requests}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditHistory;