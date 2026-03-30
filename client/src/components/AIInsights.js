import React from 'react';
import './AIInsights.css';

const AIInsights = ({ insights, loading, error }) => {
    if (loading) {
        return (
            <div className="ai-insights loading">
                <div className="spinner"></div>
                <p>🤖 AI is analyzing your performance data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-insights error">
                <h3>⚠️ Insights Unavailable</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="ai-insights empty">
                <h3>🤖 AI Performance Insights</h3>
                <p>Run a Lighthouse audit to get AI-powered recommendations.</p>
            </div>
        );
    }

    const getSeverityClass = (severity) => {
        switch (severity) {
            case 'critical': return 'severity-critical';
            case 'warning': return 'severity-warning';
            case 'info': return 'severity-info';
            default: return '';
        }
    };

    return (
        <div className="ai-insights">
            <div className="insights-header">
                <h3>🤖 DeepSeek AI Analysis</h3>
                {insights.generatedAt && (
                    <span className="timestamp">
                        Generated: {new Date(insights.generatedAt).toLocaleString()}
                    </span>
                )}
            </div>

            {insights.note && (
                <div className="insights-note">
                    ℹ️ {insights.note}
                </div>
            )}

            <div className="insights-summary">
                <h4>Summary</h4>
                <p>{insights.summary}</p>
            </div>

            {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="recommendations">
                    <h4>📋 Actionable Recommendations</h4>
                    <div className="recommendations-list">
                        {insights.recommendations.map((rec, index) => (
                            <div 
                                key={index} 
                                className={`recommendation-card ${getSeverityClass(rec.severity)}`}
                            >
                                <div className="recommendation-header">
                                    <span className="recommendation-issue">{rec.issue}</span>
                                    <span className={`severity-badge ${rec.severity}`}>
                                        {rec.severity}
                                    </span>
                                </div>
                                <div className="recommendation-details">
                                    <div className="detail-item">
                                        <strong>Network Factor:</strong> {rec.networkFactor}
                                    </div>
                                    <div className="detail-item">
                                        <strong>Suggestion:</strong> {rec.suggestion}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIInsights;