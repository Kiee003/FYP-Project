import React, { useState } from 'react';
import { testConnection, runAudit } from './services/api';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Not tested');

  // Test backend connection
  const testBackend = async () => {
    setLoading(true);
    try {
      const result = await testConnection();
      setBackendStatus(`✅ Connected! ${result.message}`);
      setError(null);
    } catch (error) {
      setBackendStatus('❌ Failed to connect to backend');
      setError('Cannot reach backend server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  // Analyze website performance
  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await runAudit(url);
      setResults(response.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to analyze website');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format time in seconds
  const formatTime = (ms) => {
    if (!ms || ms === 0) return 'N/A';
    return (ms / 1000).toFixed(2) + 's';
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 90) return '#28a745'; // Green
    if (score >= 50) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  // Get status text
  const getStatus = (value, threshold, isLessThan = true) => {
    if (!value) return 'N/A';
    if (isLessThan) {
      return value < threshold ? 'Good' : 'Poor';
    } else {
      return value < threshold ? 'Poor' : 'Good';
    }
  };

  return (
    <div className="App" style={{ 
      padding: '30px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        color: '#333', 
        borderBottom: '3px solid #007bff', 
        paddingBottom: '10px',
        marginBottom: '30px'
      }}>
        🌐 Web Performance Dashboard
      </h1>
      
      {/* Connection Test Section */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0 }}>🔌 Backend Connection Test</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={testBackend}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          <span style={{ 
            padding: '8px 15px',
            borderRadius: '4px',
            backgroundColor: backendStatus.includes('✅') ? '#d4edda' : '#f8d7da',
            color: backendStatus.includes('✅') ? '#155724' : '#721c24',
            fontWeight: 'bold'
          }}>
            {backendStatus}
          </span>
        </div>
      </div>

      {/* URL Input Form */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>🔍 Analyze Website Performance</h3>
        <form onSubmit={handleAnalyze}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., example.com or https://example.com)"
              required
              style={{
                flex: 1,
                padding: '12px 15px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}
            >
              {loading ? '⏳ Analyzing...' : '🚀 Analyze'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '15px 20px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '6px',
          marginBottom: '30px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, color: '#333', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
            📊 Results for: <span style={{ color: '#007bff' }}>{results.url}</span>
          </h2>
          
          {/* Performance Score - Large Display */}
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '30px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>Performance Score</div>
            <div style={{ 
              fontSize: '72px', 
              fontWeight: 'bold',
              color: getScoreColor(results.scores.performance),
              lineHeight: '1'
            }}>
              {results.scores.performance}
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginTop: '10px' }}>
              {results.scores.performance >= 90 ? '🎉 Excellent' : 
               results.scores.performance >= 50 ? '⚠️ Needs Improvement' : 
               '🔴 Poor'}
            </div>
          </div>

          {/* Core Web Vitals Grid */}
          <h3 style={{ marginBottom: '20px' }}>Core Web Vitals</h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <MetricCard 
              label="Largest Contentful Paint (LCP)"
              value={formatTime(results.metrics.lcp)}
              threshold="< 2.5s"
              status={results.metrics.lcp < 2500 ? 'good' : 'poor'}
              tooltip="Measures loading performance. Should occur within 2.5 seconds."
            />
            <MetricCard 
              label="First Contentful Paint (FCP)"
              value={formatTime(results.metrics.fcp)}
              threshold="< 1.8s"
              status={results.metrics.fcp < 1800 ? 'good' : 'poor'}
              tooltip="Measures time from navigation to when first content renders."
            />
            <MetricCard 
              label="Time to First Byte (TTFB)"
              value={formatTime(results.metrics.ttfb)}
              threshold="< 0.6s"
              status={results.metrics.ttfb < 600 ? 'good' : 'poor'}
              tooltip="Measures server response time. Lower is better."
            />
            <MetricCard 
              label="Cumulative Layout Shift (CLS)"
              value={results.metrics.cls?.toFixed(3) || 'N/A'}
              threshold="< 0.1"
              status={results.metrics.cls < 0.1 ? 'good' : 'poor'}
              tooltip="Measures visual stability. Should be less than 0.1."
            />
            <MetricCard 
              label="Total Blocking Time (TBT)"
              value={formatTime(results.metrics.tbt)}
              threshold="< 0.3s"
              status={results.metrics.tbt < 300 ? 'good' : 'poor'}
              tooltip="Measures total time page is blocked from responding to user input."
            />
          </div>

          {/* Additional Metrics */}
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Additional Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div>
                <strong>Total Requests:</strong> {results.requests.total}
              </div>
              <div>
                <strong>DOM Size:</strong> {results.metrics.domSize || 'N/A'} elements
              </div>
              <div>
                <strong>Server Response:</strong> {formatTime(results.metrics.serverResponseTime)}
              </div>
            </div>
            <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
              <strong>Audit Time:</strong> {new Date(results.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for metric cards
function MetricCard({ label, value, threshold, status, tooltip }) {
  const colors = {
    good: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
    poor: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' }
  };

  return (
    <div style={{ 
      backgroundColor: colors[status]?.bg || '#f8f9fa',
      padding: '15px',
      borderRadius: '6px',
      border: `1px solid ${colors[status]?.border || '#dee2e6'}`,
      position: 'relative',
      cursor: tooltip ? 'help' : 'default'
    }} title={tooltip}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors[status]?.text || '#333' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: colors[status]?.text || '#666' }}>
        Target: {threshold}
      </div>
    </div>
  );
}

export default App;