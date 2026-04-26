import React, { useState } from 'react';
import API from '../services/api';
import { saveAs } from 'file-saver';

const ExportButton = ({ auditId, url, type = 'single' }) => {
    const [exporting, setExporting] = useState(false);

    const exportAsJSON = async () => {
        setExporting(true);
        try {
            let response;
            if (type === 'single' && auditId) {
                response = await API.get(`/api/export/json/${auditId}`);
            } else if (type === 'url' && url) {
                const auditResponse = await API.get(`/api/history/${encodeURIComponent(url)}?limit=1`);
                if (auditResponse.data.data && auditResponse.data.data[0]) {
                    response = { data: { data: auditResponse.data.data[0] } };
                } else {
                    throw new Error('No audit found for this URL');
                }
            }
            
            const jsonString = JSON.stringify(response.data.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const filename = `audit_${auditId || url?.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
            saveAs(blob, filename);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export audit data');
        } finally {
            setExporting(false);
        }
    };

    const exportAsCSV = async () => {
        setExporting(true);
        try {
            let endpoint;
            if (type === 'single' && auditId) {
                endpoint = `/api/export/csv/${auditId}`;
            } else if (type === 'url' && url) {
                endpoint = `/api/export/url/${encodeURIComponent(url)}/csv`;
            } else {
                throw new Error('Invalid export parameters');
            }
            
            window.location.href = `http://localhost:5000${endpoint}`;
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export CSV');
        } finally {
            setTimeout(() => setExporting(false), 1000);
        }
    };

    const buttonStyle = {
        padding: '5px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.3s ease'
    };

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            <button 
                onClick={exportAsJSON} 
                disabled={exporting}
                style={{ ...buttonStyle, backgroundColor: '#2196f3', color: 'white' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
            >
                📄 {exporting ? 'Exporting...' : 'JSON'}
            </button>
            <button 
                onClick={exportAsCSV} 
                disabled={exporting}
                style={{ ...buttonStyle, backgroundColor: '#4caf50', color: 'white' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#388e3c'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#4caf50'}
            >
                📊 {exporting ? 'Exporting...' : 'CSV'}
            </button>
        </div>
    );
};

export default ExportButton;