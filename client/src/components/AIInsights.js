import React, { useState } from 'react';
import './AIInsights.css';

const AIInsights = ({ insights, loading, error }) => {
    const [expanded, setExpanded] = useState({});

    if (loading) {
        return (
            <div className="ai-insights loading">
                <div className="loading-spinner"></div>
                <p>🤖 AI is analyzing your website performance...</p>
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

    const toggleExpand = (index) => {
        setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Check if we have the new user-friendly format
    const hasSimpleSummary = insights.simpleSummary;
    
    // For backward compatibility, if summary is long and technical, show friendly version
    const displaySummary = insights.simpleSummary || insights.summary;
    const isTechnicalSummary = !insights.simpleSummary && insights.summary && insights.summary.length > 500;

    return (
        <div className="ai-insights">
            <div className="ai-header">
                <h2>🤖 AI Performance Analysis</h2>
                <span className="ai-badge">Powered by DeepSeek</span>
            </div>

            {/* Simple Summary - Always shown first */}
            <div className="insight-card summary-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                    <h3>What This Means For You</h3>
                    <p className="summary-text">{displaySummary}</p>
                    {isTechnicalSummary && (
                        <button 
                            className="toggle-technical"
                            onClick={() => toggleExpand('technical')}
                        >
                            {expanded['technical'] ? 'Hide technical details' : 'Show technical details'}
                        </button>
                    )}
                    {expanded['technical'] && isTechnicalSummary && (
                        <div className="technical-details">
                            <hr />
                            <h4>Technical Analysis</h4>
                            <p>{insights.summary}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recommendations Section */}
            {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="insight-card recommendations-card">
                    <div className="card-icon">💡</div>
                    <div className="card-content">
                        <h3>What You Can Do To Improve</h3>
                        <div className="recommendations-list">
                            {insights.recommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation-item ${rec.severity}`}>
                                    <div className="rec-header">
                                        <span className="rec-icon">
                                            {rec.severity === 'critical' && '🚨'}
                                            {rec.severity === 'warning' && '⚠️'}
                                            {rec.severity === 'info' && 'ℹ️'}
                                            {!rec.severity && '📌'}
                                        </span>
                                        <h4>{rec.issue}</h4>
                                    </div>
                                    
                                    {/* Plain English explanation */}
                                    {rec.plainEnglish && (
                                        <p className="rec-description">{rec.plainEnglish}</p>
                                    )}
                                    
                                    {/* Simple suggestion */}
                                    <p className="rec-suggestion">
                                        <strong>Simple fix:</strong> {rec.simpleSuggestion}
                                    </p>
                                    
                                    {/* Action items - expandable */}
                                    {rec.actionItems && rec.actionItems.length > 0 && (
                                        <div className="rec-actions">
                                            <button 
                                                className="action-toggle"
                                                onClick={() => toggleExpand(`rec-${idx}`)}
                                            >
                                                {expanded[`rec-${idx}`] ? '▼ Hide detailed steps' : '▶ Show step-by-step guide'}
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
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Tips Section */}
            <div className="insight-card quick-tips">
                <div className="card-icon">⚡</div>
                <div className="card-content">
                    <h3>Quick Tips for Better Speed</h3>
                    <div className="tips-grid">
                        <div className="tip">
                            <span className="tip-number">1</span>
                            <p>Compress images before uploading (use TinyPNG or Squoosh)</p>
                        </div>
                        <div className="tip">
                            <span className="tip-number">2</span>
                            <p>Remove plugins or features you don't really need</p>
                        </div>
                        <div className="tip">
                            <span className="tip-number">3</span>
                            <p>Ask your hosting company if they offer "caching"</p>
                        </div>
                        <div className="tip">
                            <span className="tip-number">4</span>
                            <p>Use a CDN like Cloudflare (they have a free plan!)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timestamp */}
            {insights.generatedAt && (
                <div className="insight-footer">
                    <small>Analysis generated: {new Date(insights.generatedAt).toLocaleString()}</small>
                    {insights.note && <small className="note">{insights.note}</small>}
                </div>
            )}
        </div>
    );
};

export default AIInsights;