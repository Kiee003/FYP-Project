import React, { useState } from 'react';
import { testConnection } from './services/api';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Not tested');
  const [loading, setLoading] = useState(false);

  const testBackend = async () => {
    setLoading(true);
    try {
      const result = await testConnection();
      setBackendStatus(`Connected! Message: ${result.message}`);
    } catch (error) {
      setBackendStatus('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App" style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Web Performance Dashboard</h1>
      <p>Testing connection to backend...</p>
      
      <button 
        onClick={testBackend}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          margin: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Test Backend Connection'}
      </button>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <strong>Backend Status:</strong> {backendStatus}
      </div>
    </div>
  );
}

export default App;