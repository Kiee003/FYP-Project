import React, { useState } from 'react';
import { testConnection, runAudit } from './services/api';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Not tested');

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
    if (!ms) return 'N/A';
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div className="App" style={{ 
      padding: '30px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        🌐 Web Performance Dashboard
      </h1>
      
      {/* Connection Test Section */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '5px',
        marginBottom: '30px'
      }}>
        <h3>🔌 Backend Connection Test</h3>
        <button 
          onClick={testBackend}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            marginRight: '15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        <span style={{ 
          backgroundColor: backendStatus.includes('✅') ? '#d4edda' : '#f8d7da',
          padding: '5px 10px',
          borderRadius: '4px',
          color: backendStatus.includes('✅') ? '#155724' : '#721c24'
        }}>
          {backendStatus}
        </span>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleAnalyze} style={{ marginBottom: '30px' }}>
        <h3>🔍 Analyze Website Performance</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL (e.g., https://example.com)"
            required
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Analyzing...' : '🚀 Analyze'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ Error: {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div style={{ 
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>
            📊 Results for: {results.url}
          </h2>
          
          {/* Performance Score */}
          <div style={{ 
            backgroundColor: '#e3f2fd',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Performance Score</div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold',
              color: results.scores.performance >= 90 ? '#28a745' :
                     results.scores.performance >= 50 ? '#ffc107' : '#dc3545'
            }}>
              {results.scores.performance}
            </div>
          </div>

          {/* Core Web Vitals */}
          <h3>Core Web Vitals</h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <MetricCard 
              label="Largest Contentful Paint (LCP)"
              value={formatTime(results.metrics.lcp)}
              threshold="< 2.5s"
              status={results.metrics.lcp < 2500 ? 'good' : 'poor'}
            />
            <MetricCard 
              label="First Contentful Paint (FCP)"
              value={formatTime(results.metrics.fcp)}
              threshold="< 1.8s"
              status={results.metrics.fcp < 1800 ? 'good' : 'poor'}
            />
            <MetricCard 
              label="Time to First Byte (TTFB)"
              value={formatTime(results.metrics.ttfb)}
              threshold="< 0.6s"
              status={results.metrics.ttfb < 600 ? 'good' : 'poor'}
            />
            <MetricCard 
              label="Cumulative Layout Shift (CLS)"
              value={results.metrics.cls?.toFixed(3) || 'N/A'}
              threshold="< 0.1"
              status={results.metrics.cls < 0.1 ? 'good' : 'poor'}
            />
          </div>

          {/* Request Info */}
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px'
          }}>
            <strong>Total Requests:</strong> {results.requests.total}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for metric cards
function MetricCard({ label, value, threshold, status }) {
  const colors = {
    good: { bg: '#d4edda', text: '#155724' },
    poor: { bg: '#f8d7da', text: '#721c24' }
  };

  return (
    <div style={{ 
      backgroundColor: colors[status]?.bg || '#f8f9fa',
      padding: '15px',
      borderRadius: '4px'
    }}>
      <div style={{ fontSize: '14px', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
      <div style={{ fontSize: '12px', color: colors[status]?.text || '#666' }}>
        Target: {threshold}
      </div>
    </div>
  );
}

export default App;