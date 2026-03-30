import React, { useState } from 'react';
import { runAudit } from '../services/api';
import AIInsights from './AIInsights';
import './Dashboard.css';
import LoadingIndicator from './LoadingIndicator';

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

        // Show a friendly message for long audits
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
                // Optional: Show a toast/success message
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
        if (ms === 0) return '0.00s'; // Show 0.00s for very fast responses
        return (ms / 1000).toFixed(2) + 's';
    };

    const getMetricColor = (metric, value) => {
        if (!value) return '#999';
        
        switch(metric) {
            case 'lcp':
                return value < 2500 ? '#28a745' : value < 4000 ? '#ffc107' : '#dc3545';
            case 'ttfb':
                return value < 800 ? '#28a745' : value < 1800 ? '#ffc107' : '#dc3545';
            case 'cls':
                return value < 0.1 ? '#28a745' : value < 0.25 ? '#ffc107' : '#dc3545';
            case 'tbt':
                return value < 300 ? '#28a745' : value < 600 ? '#ffc107' : '#dc3545';
            default:
                return '#28a745';
        }
    };

    return (
        <div className="dashboard">
            <h1>🚀 Web Performance Dashboard</h1>
            <p>Enter a URL to analyze performance with AI-powered insights</p>
            
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
                        <div className="metric-card">
                            <h3>Performance Score</h3>
                            <div className="score-circle" style={{
                                background: `conic-gradient(#4caf50 ${results.scores.performance * 3.6}deg, #f0f0f0 0)`
                            }}>
                                <span>{results.scores.performance}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <h3>LCP</h3>
                            <div className="metric-value" style={{ color: getMetricColor('lcp', results.metrics.lcp) }}>
                                {formatTime(results.metrics.lcp)}
                            </div>
                            <p className="metric-label">Largest Contentful Paint</p>
                        </div>

                        <div className="metric-card">
                            <h3>FCP</h3>
                            <div className="metric-value" style={{ color: getMetricColor('fcp', results.metrics.fcp) }}>
                                {formatTime(results.metrics.fcp)}
                            </div>
                            <p className="metric-label">First Contentful Paint</p>
                        </div>

                        <div className="metric-card">
                            <h3>TTFB</h3>
                            <div className="metric-value" style={{ color: getMetricColor('ttfb', results.metrics.ttfb) }}>
                                {formatTime(results.metrics.ttfb)}
                            </div>
                            <p className="metric-label">Time to First Byte</p>
                        </div>

                        <div className="metric-card">
                            <h3>CLS</h3>
                            <div className="metric-value" style={{ color: getMetricColor('cls', results.metrics.cls) }}>
                                {results.metrics.cls?.toFixed(3) || 0}
                            </div>
                            <p className="metric-label">Cumulative Layout Shift</p>
                        </div>

                        <div className="metric-card">
                            <h3>TBT</h3>
                            <div className="metric-value" style={{ color: getMetricColor('tbt', results.metrics.tbt) }}>
                                {formatTime(results.metrics.tbt)}
                            </div>
                            <p className="metric-label">Total Blocking Time</p>
                        </div>

                        <div className="metric-card">
                            <h3>Requests</h3>
                            <div className="metric-value">{results.requests.total}</div>
                            <p className="metric-label">Total Network Requests</p>
                        </div>
                    </div>

                    <AIInsights 
                        insights={results.aiInsights}
                        loading={loading}
                        error={null}
                    />
                </div>
            )}
        </div>
    );
};

export default Dashboard;