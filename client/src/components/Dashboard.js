import React, { useState } from 'react';
import { runAudit } from '../services/api';
import AIInsights from './AIInsights';
import './Dashboard.css';
import LoadingIndicator from './LoadingIndicator';
import AuditHistory from './AuditHistory';
import UrlCrawler from './UrlCrawler';

const Dashboard = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        const loadingMessage = setTimeout(() => {
            if (loading) {
                console.log('⏳ Audit taking longer than expected...');
            }
        }, 10000);

        try {
            const response = await runAudit(url);
            clearTimeout(loadingMessage);
            
            if (response.success) {
                setResults(response.data);
                console.log('✅ Audit complete!');
            } else {
                setError(response.error || 'Audit failed');
            }
        } catch (err) {
            clearTimeout(loadingMessage);
            setError(err.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (ms) => {
        if (ms === undefined || ms === null) return 'N/A';
        if (ms === 0) return '0.00s';
        return (ms / 1000).toFixed(2) + 's';
    };

    // Enhanced color coding with status labels
    const getMetricStatus = (metric, value) => {
        if (!value && value !== 0) return { color: '#999', status: 'No Data', icon: '❓' };
        
        switch(metric) {
            case 'performance_score':
                if (value >= 90) return { color: '#28a745', status: 'Excellent', icon: '🎉', bg: '#d4edda' };
                if (value >= 70) return { color: '#17a2b8', status: 'Good', icon: '👍', bg: '#d1ecf1' };
                if (value >= 50) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                if (value >= 30) return { color: '#fd7e14', status: 'Poor', icon: '🔴', bg: '#ffe5d0' };
                return { color: '#dc3545', status: 'Critical', icon: '🚨', bg: '#f8d7da' };
            
            case 'lcp':
                if (value < 2500) return { color: '#28a745', status: 'Good', icon: '✅', bg: '#d4edda' };
                if (value < 4000) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                return { color: '#dc3545', status: 'Poor', icon: '🔴', bg: '#f8d7da' };
            
            case 'fcp':
                if (value < 1800) return { color: '#28a745', status: 'Good', icon: '✅', bg: '#d4edda' };
                if (value < 3000) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                return { color: '#dc3545', status: 'Poor', icon: '🔴', bg: '#f8d7da' };
            
            case 'ttfb':
                if (value === 0) return { color: '#999', status: 'Not Measured', icon: '❓', bg: '#e9ecef' };
                if (value < 800) return { color: '#28a745', status: 'Good', icon: '✅', bg: '#d4edda' };
                if (value < 1800) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                return { color: '#dc3545', status: 'Poor', icon: '🔴', bg: '#f8d7da' };
            
            case 'cls':
                if (value < 0.1) return { color: '#28a745', status: 'Good', icon: '✅', bg: '#d4edda' };
                if (value < 0.25) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                return { color: '#dc3545', status: 'Poor', icon: '🔴', bg: '#f8d7da' };
            
            case 'tbt':
                if (value < 300) return { color: '#28a745', status: 'Good', icon: '✅', bg: '#d4edda' };
                if (value < 600) return { color: '#ffc107', status: 'Needs Improvement', icon: '⚠️', bg: '#fff3cd' };
                return { color: '#dc3545', status: 'Poor', icon: '🔴', bg: '#f8d7da' };
            
            default:
                return { color: '#28a745', status: 'OK', icon: '✅', bg: '#d4edda' };
        }
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🚀 Web Performance Dashboard</h1>
                <p>Enter a URL to analyze performance with AI-powered insights</p>
            </div>
            
            <form onSubmit={handleSubmit} className="url-form">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Analyzing...' : 'Run Audit'}
                </button>
            </form>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            {loading && <LoadingIndicator message="Analyzing website performance..." />}

            {results && (
                <div className="results">
                    <div className="metrics-grid">
                        {/* Performance Score - Special circular card */}
                        <div className="metric-card score-card">
                            <h3>Performance Score</h3>
                            {(() => {
                                const status = getMetricStatus('performance_score', results.scores.performance);
                                return (
                                    <>
                                        <div className="score-circle" style={{
                                            background: `conic-gradient(${status.color} ${results.scores.performance * 3.6}deg, #e0e0e0 0)`
                                        }}>
                                            <span style={{ color: status.color }}>{results.scores.performance}</span>
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* LCP Card */}
                        <div className="metric-card">
                            <h3>LCP</h3>
                            {(() => {
                                const status = getMetricStatus('lcp', results.metrics.lcp);
                                return (
                                    <>
                                        <div className="metric-value" style={{ color: status.color, fontSize: '28px', fontWeight: 'bold' }}>
                                            {formatTime(results.metrics.lcp)}
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                        <p className="metric-label">Largest Contentful Paint</p>
                                        <p className="metric-target">Target: {'< 2.5s'}</p>
                                    </>
                                );
                            })()}
                        </div>

                        {/* FCP Card */}
                        <div className="metric-card">
                            <h3>FCP</h3>
                            {(() => {
                                const status = getMetricStatus('fcp', results.metrics.fcp);
                                return (
                                    <>
                                        <div className="metric-value" style={{ color: status.color, fontSize: '28px', fontWeight: 'bold' }}>
                                            {formatTime(results.metrics.fcp)}
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                        <p className="metric-label">First Contentful Paint</p>
                                        <p className="metric-target">Target: {'< 1.8s'}</p>
                                    </>
                                );
                            })()}
                        </div>

                        {/* TTFB Card */}
                        <div className="metric-card">
                            <h3>TTFB</h3>
                            {(() => {
                                const status = getMetricStatus('ttfb', results.metrics.ttfb);
                                return (
                                    <>
                                        <div className="metric-value" style={{ color: status.color, fontSize: '28px', fontWeight: 'bold' }}>
                                            {results.metrics.ttfb === 0 ? 'N/A' : formatTime(results.metrics.ttfb)}
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                        <p className="metric-label">Time to First Byte</p>
                                        <p className="metric-target">Target: {'< 0.8s'}</p>
                                    </>
                                );
                            })()}
                        </div>

                        {/* CLS Card */}
                        <div className="metric-card">
                            <h3>CLS</h3>
                            {(() => {
                                const status = getMetricStatus('cls', results.metrics.cls);
                                return (
                                    <>
                                        <div className="metric-value" style={{ color: status.color, fontSize: '28px', fontWeight: 'bold' }}>
                                            {results.metrics.cls?.toFixed(3) || 0}
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                        <p className="metric-label">Cumulative Layout Shift</p>
                                        <p className="metric-target">Target: {'< 0.1'}</p>
                                    </>
                                );
                            })()}
                        </div>

                        {/* TBT Card */}
                        <div className="metric-card">
                            <h3>TBT</h3>
                            {(() => {
                                const status = getMetricStatus('tbt', results.metrics.tbt);
                                return (
                                    <>
                                        <div className="metric-value" style={{ color: status.color, fontSize: '28px', fontWeight: 'bold' }}>
                                            {formatTime(results.metrics.tbt)}
                                        </div>
                                        <div className="metric-status" style={{ backgroundColor: status.bg, color: status.color }}>
                                            <span>{status.icon}</span> {status.status}
                                        </div>
                                        <p className="metric-label">Total Blocking Time</p>
                                        <p className="metric-target">Target: {'< 0.3s'}</p>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Requests Card */}
                        <div className="metric-card">
                            <h3>Requests</h3>
                            <div className="metric-value" style={{ fontSize: '28px', fontWeight: 'bold', color: results.requests.total > 100 ? '#ffc107' : '#28a745' }}>
                                {results.requests.total}
                            </div>
                            <div className="metric-status" style={{ 
                                backgroundColor: results.requests.total > 100 ? '#fff3cd' : '#d4edda',
                                color: results.requests.total > 100 ? '#ffc107' : '#28a745'
                            }}>
                                <span>{results.requests.total > 100 ? '⚠️' : '✅'}</span> 
                                {results.requests.total > 100 ? 'High' : 'Normal'}
                            </div>
                            <p className="metric-label">Total Network Requests</p>
                            <p className="metric-target">Ideal: {'< 50'}</p>
                        </div>
                    </div>

                    <AIInsights 
                        insights={results.aiInsights}
                        loading={loading}
                        error={null}
                    />

                    <AuditHistory url={results.url} />
                    
                    <UrlCrawler />
                </div>
            )}
        </div>
    );
};

export default Dashboard;