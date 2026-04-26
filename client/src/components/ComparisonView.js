import React, { useState } from 'react';
import API from '../services/api';

const ComparisonView = ({ currentAuditId, currentUrl }) => {
    const [comparisonType, setComparisonType] = useState('url');
    const [compareUrl, setCompareUrl] = useState('');
    const [compareAuditId, setCompareAuditId] = useState('');
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCompare = async () => {
        setLoading(true);
        setError(null);
        
        try {
            let requestBody = {};
            
            if (comparisonType === 'url') {
                if (!compareUrl) {
                    setError('Please enter a URL to compare');
                    setLoading(false);
                    return;
                }
                requestBody = { urls: [currentUrl, compareUrl] };
            } else {
                if (!compareAuditId) {
                    setError('Please enter an Audit ID to compare');
                    setLoading(false);
                    return;
                }
                requestBody = { auditIds: [parseInt(currentAuditId), parseInt(compareAuditId)] };
            }
            
            const response = await API.post('/api/compare', requestBody);
            
            if (response.data.success) {
                setComparisonData(response.data.data);
            } else {
                setError(response.data.error);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const getScoreClass = (score) => {
        if (score >= 90) return '#28a745';
        if (score >= 50) return '#ffc107';
        return '#dc3545';
    };

    const getMetricComparison = (item1, item2, metric) => {
        const val1 = parseFloat(item1[metric]);
        const val2 = parseFloat(item2[metric]);
        
        if (metric === 'performance_score') {
            if (val1 > val2) return { winner: 'first', diff: val1 - val2 };
            if (val2 > val1) return { winner: 'second', diff: val2 - val1 };
            return { winner: 'tie', diff: 0 };
        } else {
            if (val1 < val2) return { winner: 'first', diff: val2 - val1 };
            if (val2 < val1) return { winner: 'second', diff: val1 - val2 };
            return { winner: 'tie', diff: 0 };
        }
    };

    if (!currentAuditId && !currentUrl) {
        return null;
    }

    return (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
            <h3 style={{ marginBottom: '15px' }}>🔍 Compare Performance</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            value="url"
                            checked={comparisonType === 'url'}
                            onChange={() => setComparisonType('url')}
                        />
                        Compare with another URL
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            value="audit"
                            checked={comparisonType === 'audit'}
                            onChange={() => setComparisonType('audit')}
                        />
                        Compare with specific audit ID
                    </label>
                </div>
                
                {comparisonType === 'url' ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Enter URL to compare (e.g., https://google.com)"
                            value={compareUrl}
                            onChange={(e) => setCompareUrl(e.target.value)}
                            style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="number"
                            placeholder="Enter Audit ID (e.g., 5)"
                            value={compareAuditId}
                            onChange={(e) => setCompareAuditId(e.target.value)}
                            style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
                        />
                    </div>
                )}
                
                <button 
                    onClick={handleCompare} 
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        background: '#6c5ce7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#5b4bc4'}
                    onMouseLeave={(e) => e.target.style.background = '#6c5ce7'}
                >
                    {loading ? 'Comparing...' : 'Compare'}
                </button>
            </div>
            
            {error && (
                <div style={{ color: '#dc3545', padding: '10px', background: '#ffe6e6', borderRadius: '5px', marginBottom: '15px' }}>
                    ❌ {error}
                </div>
            )}
            
            {comparisonData && comparisonData.items && (
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '8px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <strong style={{ display: 'block', fontSize: '16px', wordBreak: 'break-all' }}>{comparisonData.items[0]?.url}</strong>
                            <small style={{ color: '#666', fontSize: '12px' }}>{new Date(comparisonData.items[0]?.timestamp).toLocaleString()}</small>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <strong style={{ display: 'block', fontSize: '16px', wordBreak: 'break-all' }}>{comparisonData.items[1]?.url}</strong>
                            <small style={{ color: '#666', fontSize: '12px' }}>{new Date(comparisonData.items[1]?.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#f1f3f5' }}>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Metric</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>First</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Second</th>
                                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Winner</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['performance_score', 'lcp', 'fcp', 'ttfb', 'cls', 'tbt', 'requests'].map(metric => {
                                const item1 = comparisonData.items[0];
                                const item2 = comparisonData.items[1];
                                const comparison = getMetricComparison(item1, item2, metric);
                                
                                const metricLabels = {
                                    performance_score: 'Performance Score',
                                    lcp: 'LCP (seconds)',
                                    fcp: 'FCP (seconds)',
                                    ttfb: 'TTFB (seconds)',
                                    cls: 'CLS',
                                    tbt: 'TBT (seconds)',
                                    requests: 'Requests'
                                };
                                
                                const lowerIsBetter = metric !== 'performance_score';
                                const winnerText = comparison.winner === 'first' 
                                    ? (lowerIsBetter ? '✅ Better' : '🏆 Higher')
                                    : comparison.winner === 'second'
                                    ? (lowerIsBetter ? '✅ Better' : '🏆 Higher')
                                    : '⚖️ Tie';
                                
                                return (
                                    <tr key={metric}>
                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{metricLabels[metric]}</td>
                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee', color: metric === 'performance_score' ? getScoreClass(item1[metric]) : '#333', fontWeight: metric === 'performance_score' ? 'bold' : 'normal' }}>
                                            {item1[metric]}
                                            {comparison.winner === 'first' && <span style={{ marginLeft: '5px' }}>🏆</span>}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee', color: metric === 'performance_score' ? getScoreClass(item2[metric]) : '#333', fontWeight: metric === 'performance_score' ? 'bold' : 'normal' }}>
                                            {item2[metric]}
                                            {comparison.winner === 'second' && <span style={{ marginLeft: '5px' }}>🏆</span>}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee', color: comparison.winner === 'tie' ? '#6c757d' : '#28a745', fontWeight: '500' }}>
                                            {winnerText}
                                            {comparison.diff > 0 && ` (${comparison.diff.toFixed(1)})`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px' }}>
                        <p>🏆 <strong>Best Overall Performance:</strong> {comparisonData.summary.bestPerformance}</p>
                        <p>⚡ <strong>Fastest LCP:</strong> {comparisonData.summary.bestLcp}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonView;