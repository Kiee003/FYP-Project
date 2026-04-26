import React, { useState, useEffect } from 'react';
import { getAuditHistory } from '../services/api';
import PerformanceChart from './PerformanceChart';
import ExportButton from './ExportButton';
import ComparisonView from './ComparisonView';
import { getTrendData } from '../services/api';

const AuditHistory = ({ url }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [trendData, setTrendData] = useState(null);
    const [showChart, setShowChart] = useState(false);

    useEffect(() => {
        if (url) {
            loadHistory();
        }
    }, [url]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAuditHistory(url, 10);
            if (response.success) {
                setHistory(response.data);
            }
        } catch (err) {
            setError('Failed to load audit history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTrendData = async () => {
        if (!url) return;
        try {
            const response = await getTrendData(url, 10);
            if (response.success) {
                setTrendData(response.data);
            }
        } catch (error) {
            console.error('Failed to load trend data:', error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getScoreClass = (score) => {
        if (score >= 90) return { color: '#28a745', fontWeight: 'bold' };
        if (score >= 50) return { color: '#ffc107', fontWeight: 'bold' };
        return { color: '#dc3545', fontWeight: 'bold' };
    };

    if (loading && history.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading history...</div>;
    }

    if (error) {
        return <div style={{ color: '#dc3545', padding: '20px', textAlign: 'center' }}>{error}</div>;
    }

    if (history.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No previous audits for this URL</div>;
    }

    const latestAuditId = history[0]?.id;

    return (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>📜 Audit History</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => {
                            setShowChart(!showChart);
                            if (!showChart && !trendData) loadTrendData();
                        }}
                        style={{
                            padding: '5px 12px',
                            background: showChart ? '#dc3545' : '#6c5ce7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {showChart ? 'Hide Chart' : 'Show Trend Chart'}
                    </button>
                    <ExportButton url={url} type="url" />
                </div>
            </div>
            
            {showChart && trendData && (
                <PerformanceChart trendData={trendData} title={`Performance Trend for ${url}`} />
            )}
            
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#f1f3f5' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>LCP</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>TTFB</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Requests</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((audit, index) => (
                            <tr key={audit.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{formatDate(audit.created_at)}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={getScoreClass(audit.performance_score)}>
                                        {audit.performance_score}/100
                                    </span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.lcp / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.ttfb / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{audit.requests}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <ExportButton auditId={audit.id} type="single" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Comparison Component */}
            <ComparisonView currentAuditId={latestAuditId} currentUrl={url} />
        </div>
    );
};

export default AuditHistory;