import React, { useState } from 'react';
import { runAudit } from '../services/api';
import AIInsights from './AIInsights';
import LoadingIndicator from './LoadingIndicator';
import AuditHistory from './AuditHistory';
import UrlCrawler from './UrlCrawler';
import ComparisonView from './ComparisonView';
import UserAuditManager from './UserAuditManager';
import AdminPanel from './AdminPanel';
import Sidebar from './Sidebar';
import './Dashboard.css';

const Dashboard = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [activePanel, setActivePanel] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await runAudit(url);
            if (response.success) {
                setResults(response.data);
            } else {
                setError(response.error || 'Audit failed');
            }
        } catch (err) {
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

    const getMetricStatus = (metric, value) => {
        if (!value && value !== 0) return { color: '#999', status: 'No Data', icon: '○', bg: '#e9ecef' };

        switch(metric) {
            case 'performance_score':
                if (value >= 90) return { color: '#28a745', status: 'Excellent',         icon: '●', bg: '#d4edda' };
                if (value >= 70) return { color: '#17a2b8', status: 'Good',              icon: '●', bg: '#d1ecf1' };
                if (value >= 50) return { color: '#ffc107', status: 'Needs Improvement', icon: '●', bg: '#fff3cd' };
                if (value >= 30) return { color: '#fd7e14', status: 'Poor',              icon: '●', bg: '#ffe5d0' };
                return             { color: '#dc3545', status: 'Critical',        icon: '●', bg: '#f8d7da' };
            case 'lcp':
                if (value < 2500) return { color: '#28a745', status: 'Good',             icon: '●', bg: '#d4edda' };
                if (value < 4000) return { color: '#ffc107', status: 'Needs Improvement',icon: '●', bg: '#fff3cd' };
                return              { color: '#dc3545', status: 'Poor',             icon: '●', bg: '#f8d7da' };
            case 'fcp':
                if (value < 1800) return { color: '#28a745', status: 'Good',             icon: '●', bg: '#d4edda' };
                if (value < 3000) return { color: '#ffc107', status: 'Needs Improvement',icon: '●', bg: '#fff3cd' };
                return              { color: '#dc3545', status: 'Poor',             icon: '●', bg: '#f8d7da' };
            case 'ttfb':
                if (value === 0)  return { color: '#999',    status: 'Not Measured',      icon: '○', bg: '#e9ecef' };
                if (value < 800)  return { color: '#28a745', status: 'Good',              icon: '●', bg: '#d4edda' };
                if (value < 1800) return { color: '#ffc107', status: 'Needs Improvement', icon: '●', bg: '#fff3cd' };
                return              { color: '#dc3545', status: 'Poor',              icon: '●', bg: '#f8d7da' };
            case 'cls':
                if (value < 0.1)  return { color: '#28a745', status: 'Good',             icon: '●', bg: '#d4edda' };
                if (value < 0.25) return { color: '#ffc107', status: 'Needs Improvement',icon: '●', bg: '#fff3cd' };
                return              { color: '#dc3545', status: 'Poor',             icon: '●', bg: '#f8d7da' };
            case 'tbt':
                if (value < 300)  return { color: '#28a745', status: 'Good',             icon: '●', bg: '#d4edda' };
                if (value < 600)  return { color: '#ffc107', status: 'Needs Improvement',icon: '●', bg: '#fff3cd' };
                return              { color: '#dc3545', status: 'Poor',             icon: '●', bg: '#f8d7da' };
            default:
                return { color: '#28a745', status: 'OK', icon: '●', bg: '#d4edda' };
        }
    };

    const PANEL_TITLES = {
        history:  'Audit History',
        compare:  'Compare Performance',
        crawler:  'URL Crawler',
        userdata: 'User Audit Data',
        accounts: 'Manage Accounts',
    };

    return (
        <div className="app-layout">
            <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />

            <main className="main-content">
                {/* Page header */}
                <div className="dashboard-header">
                    <h1>Web Performance Dashboard</h1>
                    <p>Enter a URL to analyse performance with AI-powered insights</p>
                </div>

                {/* URL form */}
                <form onSubmit={handleSubmit} className="url-form">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Analysing...' : 'Run Audit'}
                    </button>
                </form>

                {error && (
                    <div className="error-message">
                        <svg style={{ marginRight: '8px', verticalAlign: 'middle', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        {error}
                    </div>
                )}
                {loading && <LoadingIndicator message="Analysing website performance..." />}

                {/* Audit results */}
                {results && (
                    <div className="results">
                        <div className="metrics-grid">
                            {/* Performance Score */}
                            <div className="metric-card score-card">
                                <h3>Performance Score</h3>
                                {(() => {
                                    const s = getMetricStatus('performance_score', results.scores.performance);
                                    return (
                                        <>
                                            <div className="score-circle" style={{
                                                background: `conic-gradient(${s.color} ${results.scores.performance * 3.6}deg, #e0e0e0 0)`
                                            }}>
                                                <span style={{ color: s.color }}>{results.scores.performance}</span>
                                            </div>
                                            <div className="metric-status" style={{ backgroundColor: s.bg, color: s.color }}>
                                                {s.icon} {s.status}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {[
                                { key: 'lcp',  label: 'LCP',  full: 'Largest Contentful Paint',  target: '< 2.5s', val: formatTime(results.metrics.lcp) },
                                { key: 'fcp',  label: 'FCP',  full: 'First Contentful Paint',     target: '< 1.8s', val: formatTime(results.metrics.fcp) },
                                { key: 'ttfb', label: 'TTFB', full: 'Time to First Byte',          target: '< 0.8s', val: results.metrics.ttfb === 0 ? 'N/A' : formatTime(results.metrics.ttfb) },
                                { key: 'cls',  label: 'CLS',  full: 'Cumulative Layout Shift',     target: '< 0.1',  val: results.metrics.cls?.toFixed(3) || 0 },
                                { key: 'tbt',  label: 'TBT',  full: 'Total Blocking Time',         target: '< 0.3s', val: formatTime(results.metrics.tbt) },
                            ].map(m => {
                                const s = getMetricStatus(m.key, results.metrics[m.key]);
                                return (
                                    <div className="metric-card" key={m.key}>
                                        <h3>{m.label}</h3>
                                        <div className="metric-value" style={{ color: s.color }}>{m.val}</div>
                                        <div className="metric-status" style={{ backgroundColor: s.bg, color: s.color }}>
                                            {s.icon} {s.status}
                                        </div>
                                        <p className="metric-label">{m.full}</p>
                                        <p className="metric-target">Target: {m.target}</p>
                                    </div>
                                );
                            })}

                            {/* Requests */}
                            <div className="metric-card">
                                <h3>Requests</h3>
                                <div className="metric-value" style={{ color: results.requests.total > 100 ? '#ffc107' : '#28a745' }}>
                                    {results.requests.total}
                                </div>
                                <div className="metric-status" style={{
                                    backgroundColor: results.requests.total > 100 ? '#fff3cd' : '#d4edda',
                                    color: results.requests.total > 100 ? '#ffc107' : '#28a745'
                                }}>
                                    {results.requests.total > 100 ? '● High' : '● Normal'}
                                </div>
                                <p className="metric-label">Total Network Requests</p>
                                <p className="metric-target">Ideal: {'< 50'}</p>
                            </div>
                        </div>

                        {/* AI Analysis — always shown after audit */}
                        <AIInsights insights={results.aiInsights} loading={loading} error={null} />
                    </div>
                )}

                {/* Sidebar panel content */}
                {activePanel && (
                    <div className="panel-section">
                        <div className="panel-section__header">
                            <h2>{PANEL_TITLES[activePanel]}</h2>
                            <button className="panel-section__close" onClick={() => setActivePanel(null)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Close
                            </button>
                        </div>

                        {activePanel === 'history'  && <AuditHistory url={results?.url} />}
                        {activePanel === 'compare'  && <ComparisonView currentAuditId={results?.id} currentUrl={results?.url} />}
                        {activePanel === 'crawler'  && <UrlCrawler />}
                        {activePanel === 'userdata' && <UserAuditManager />}
                        {activePanel === 'accounts' && <AdminPanel onClose={() => setActivePanel(null)} />}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
