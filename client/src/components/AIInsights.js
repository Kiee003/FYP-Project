import React, { useState } from 'react';
import './AIInsights.css';

const AIInsights = ({ insights, loading, error }) => {
    const [expanded, setExpanded] = useState({});

    if (loading) {
        return (
            <div className="ai-insights loading">
                <div className="loading-spinner"></div>
                <p>🤖 AI is analysing your website performance...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-insights error">
                <p>⚠️ Could not load AI insights. Please try again.</p>
            </div>
        );
    }

    if (!insights) {
        return null;
    }

    const toggleExpand = (key) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const severityConfig = {
        critical: { icon: '🚨', label: 'Critical', className: 'critical' },
        warning:  { icon: '⚠️',  label: 'Needs Fix', className: 'warning' },
        info:     { icon: 'ℹ️',  label: 'Note', className: 'info' },
    };

    return (
        <div className="ai-insights">
            <div className="ai-header">
                <h2>🤖 AI Performance Analysis</h2>
                <span className="ai-badge">
                    {insights.isRealAI ? 'Powered by DeepSeek' : 'Metrics-Based Analysis'}
                </span>
            </div>

            {/* Verdict — one-line honest summary */}
            {insights.verdict && (
                <div className="verdict-banner">
                    <span className="verdict-text">{insights.verdict}</span>
                </div>
            )}

            {/* Full AI Summary */}
            <div className="insight-card summary-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                    <h3>What This Means For Your Visitors</h3>
                    {insights.summary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                        <p key={i} className="summary-text">{paragraph}</p>
                    ))}
                    {insights.note && (
                        <p className="fallback-note">⚠️ {insights.note}</p>
                    )}
                </div>
            </div>

            {/* AI-Generated Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="insight-card recommendations-card">
                    <div className="card-icon">💡</div>
                    <div className="card-content">
                        <h3>What To Fix</h3>
                        <div className="recommendations-list">
                            {insights.recommendations.map((rec, idx) => {
                                const config = severityConfig[rec.severity] || severityConfig.info;
                                return (
                                    <div key={idx} className={`recommendation-item ${config.className}`}>
                                        <div className="rec-header">
                                            <span className="rec-icon">{config.icon}</span>
                                            <h4>{rec.issue}</h4>
                                            <span className="severity-badge">{config.label}</span>
                                        </div>

                                        {rec.plainEnglish && (
                                            <p className="rec-description">{rec.plainEnglish}</p>
                                        )}

                                        {rec.simpleSuggestion && (
                                            <p className="rec-suggestion">
                                                <strong>Fix:</strong> {rec.simpleSuggestion}
                                            </p>
                                        )}

                                        {rec.actionItems && rec.actionItems.length > 0 && (
                                            <div className="rec-actions">
                                                <button
                                                    className="action-toggle"
                                                    onClick={() => toggleExpand(`rec-${idx}`)}
                                                >
                                                    {expanded[`rec-${idx}`] ? '▼ Hide steps' : '▶ Show step-by-step guide'}
                                                </button>
                                                {expanded[`rec-${idx}`] && (
                                                    <ul className="action-items">
                                                        {rec.actionItems.map((action, actionIdx) => (
                                                            <li key={actionIdx}>
                                                                <span className="checkmark">✓</span> {action}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Timestamp */}
            {insights.generatedAt && (
                <div className="insight-footer">
                    <small>Analysis generated: {new Date(insights.generatedAt).toLocaleString()}</small>
                </div>
            )}
        </div>
    );
};

export default AIInsights;