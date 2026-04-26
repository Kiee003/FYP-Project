import React, { useState } from 'react';
import API from '../services/api';

const UrlCrawler = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCrawl = async (e) => {
        e.preventDefault();
        
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await API.post('/api/crawl/analyze', { url });
            
            if (response.data.success) {
                setResult(response.data.data);
            } else {
                setError(response.data.error);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderTargetContent = () => {
        if (!result?.targetPageContent) return null;
        
        const content = result.targetPageContent;
        return (
            <div style={{ background: '#1e1e1e', color: '#d4d4d4', borderRadius: '8px', overflow: 'hidden', marginTop: '15px' }}>
                <h4 style={{ color: '#fff', marginBottom: '10px', padding: '15px 15px 0 15px' }}>🎯 Target Page Source Code (istudent.uitm.edu.my)</h4>
                <details style={{ padding: '0 15px 15px 15px' }}>
                    <summary style={{ cursor: 'pointer', color: '#6c5ce7', fontWeight: '500' }}>View Source Code Preview</summary>
                    <pre style={{
                        background: '#2d2d2d',
                        padding: '15px',
                        borderRadius: '5px',
                        overflowX: 'auto',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        marginTop: '10px'
                    }}>
                        {content.preview}
                        {content.length > 2000 && '\n\n...(truncated)...'}
                    </pre>
                </details>
                <p style={{ padding: '0 15px 15px 15px', fontSize: '12px', color: '#aaa', textAlign: 'right', margin: 0 }}>
                    Total size: {(content.length / 1024).toFixed(2)} KB
                </p>
            </div>
        );
    };

    return (
        <div style={{ marginTop: '30px', padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '5px' }}>🕷️ Smart URL Crawler</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Enter a URL to analyze its hyperlinks and automatically detect istudent.uitm.edu.my links
            </p>
            
            <form onSubmit={handleCrawl} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://istudent.uitm.edu.my/index_isp.htm"
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px'
                    }}
                />
                <button 
                    type="submit" 
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
                    {loading ? 'Crawling...' : '🔍 Crawl & Analyze'}
                </button>
            </form>

            {error && (
                <div style={{ color: '#dc3545', padding: '12px', background: '#ffe6e6', borderRadius: '5px', marginBottom: '15px' }}>
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #6c5ce7',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                    }}></div>
                    <p>Fetching page source and analyzing links...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {result && (
                <div>
                    {/* Source Info */}
                    <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '10px' }}>📄 Source Information</h4>
                        <p><strong>URL:</strong> {result.sourceUrl}</p>
                        <p><strong>HTML Size:</strong> {(result.sourceHtmlLength / 1024).toFixed(2)} KB</p>
                    </div>

                    {/* Link Statistics */}
                    <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '15px' }}>🔗 Link Statistics</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                            <div style={{ padding: '15px', background: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6c5ce7' }}>{result.totalLinksFound}</div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Total Links Found</div>
                            </div>
                            <div style={{ padding: '15px', background: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6c5ce7' }}>{result.internalLinks}</div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Internal Links</div>
                            </div>
                            <div style={{ padding: '15px', background: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6c5ce7' }}>{result.externalLinks}</div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>External Links</div>
                            </div>
                            <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center', border: '2px solid #4caf50' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4caf50' }}>{result.targetDomainLinks?.length || 0}</div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>istudent.uitm.edu.my Links</div>
                            </div>
                        </div>
                    </div>

                    {/* Target Domain Links */}
                    {result.targetDomainLinks && result.targetDomainLinks.length > 0 && (
                        <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <h4 style={{ marginBottom: '10px' }}>🎯 Found istudent.uitm.edu.my Links</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {result.targetDomainLinks.map((link, idx) => (
                                    <li key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2196f3', textDecoration: 'none' }}>
                                            {link.url}
                                        </a>
                                        {link.text && <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}> - {link.text}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Target Page Content */}
                    {renderTargetContent()}

                    {/* All Links */}
                    {result.allLinks && result.allLinks.length > 0 && (
                        <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <h4>📋 All Links Found</h4>
                            <details>
                                <summary style={{ cursor: 'pointer', color: '#6c5ce7', fontWeight: '500' }}>Show {result.allLinks.length} links</summary>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                                    {result.allLinks.map((link, idx) => (
                                        <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: '#2196f3', textDecoration: 'none', fontSize: '13px', wordBreak: 'break-all' }}>
                                                {link.url}
                                            </a>
                                            {link.text && <span style={{ color: '#666', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.text}</span>}
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                background: link.isInternal ? '#e3f2fd' : '#fce4ec',
                                                color: link.isInternal ? '#1976d2' : '#c2185b'
                                            }}>
                                                {link.isInternal ? 'Internal' : 'External'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UrlCrawler;