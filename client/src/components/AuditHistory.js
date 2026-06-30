import React, { useState, useEffect, useCallback } from 'react';
import { getAuditHistory, getTrendData } from '../services/api';
import PerformanceChart from './PerformanceChart';
import ExportButton from './ExportButton';

// SVG icon for the section header
const HistoryIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
        <polyline points="12 7 12 12 15 15"/>
    </svg>
);

// Copy icon
const CopyIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);

// Check icon — shown after copy
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const AuditHistory = ({ url }) => {
    const [history, setHistory] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [trendData, setTrendData] = useState(null);
    const [showChart, setShowChart] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadHistory = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getAuditHistory(url, 10);
            if (response.success) {
                setHistory(response.data);
                setTotalCount(response.totalCount ?? response.data.length);
            }
        } catch (err) {
            setError('Failed to load audit history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const loadTrendData = async () => {
        if (!url) return;
        try {
            const response = await getTrendData(url, 10);
            if (response.success) setTrendData(response.data);
        } catch (err) {
            console.error('Failed to load trend data:', err);
        }
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    const getScoreStyle = (score) => {
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

    return (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#333', flexWrap: 'wrap' }}>
                    <HistoryIcon />
                    Audit History:
                    {url && (
                        <button
                            onClick={handleCopyUrl}
                            title="Click to copy URL"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: copied ? '#28a745' : '#6c5ce7',
                                background: copied ? '#d4edda' : '#f0eeff',
                                border: `1px solid ${copied ? '#28a745' : '#c4b5fd'}`,
                                borderRadius: '6px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                wordBreak: 'break-all',
                                transition: 'all 0.2s',
                            }}
                        >
                            {copied ? <CheckIcon /> : <CopyIcon />}
                            {copied ? 'Copied!' : url}
                        </button>
                    )}
                </h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '12px',
                        color: '#555',
                        background: '#eee',
                        padding: '5px 12px',
                        borderRadius: '14px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                    }}>
                        {totalCount} total audit{totalCount !== 1 ? 's' : ''}
                        {totalCount > history.length && (
                            <span style={{ fontWeight: '400', marginLeft: '4px' }}>(showing latest {history.length})</span>
                        )}
                    </span>
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
                            fontSize: '12px',
                            fontWeight: '500',
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

            {/* History table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#f1f3f5' }}>
                            <th style={{ padding: '12px 10px', textAlign: 'center', width: '55px', color: '#888', fontSize: '12px', fontWeight: '600' }}>ID</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>LCP</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>FCP</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>TTFB</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>CLS</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>TBT</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Requests</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((audit) => (
                            <tr key={audit.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px 10px', textAlign: 'center', color: '#aaa', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }} title="Audit ID — use this to compare by Audit ID">
                                    #{audit.id}
                                </td>
                                <td style={{ padding: '12px' }}>{formatDate(audit.created_at)}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={getScoreStyle(audit.performance_score)}>
                                        {audit.performance_score}/100
                                    </span>
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.lcp  / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.fcp  / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.ttfb / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{audit.cls?.toFixed(3) || '0.000'}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{(audit.tbt  / 1000).toFixed(2)}s</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{audit.requests}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <ExportButton auditId={audit.id} type="single" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditHistory;