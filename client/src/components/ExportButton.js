import React, { useState } from 'react';
import API from '../services/api';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ExportButton = ({ auditId, url, type = 'single' }) => {
    const [exporting, setExporting] = useState(false);

    // ── Fetch single audit ────────────────────────────────────────────────────
    const fetchSingleAudit = async () => {
        if (type === 'single' && auditId) {
            const res = await API.get(`/api/export/json/${auditId}`);
            return res.data.data;
        }
        throw new Error('Invalid parameters for single fetch');
    };

    // ── Fetch ALL audits for a URL (up to 100) ────────────────────────────────
    const fetchAllAudits = async () => {
        if (type === 'url' && url) {
            const res = await API.get(`/api/history/${encodeURIComponent(url)}?limit=100`);
            if (res.data.data && res.data.data.length > 0) return res.data.data;
            throw new Error('No audits found for this URL');
        }
        throw new Error('Invalid parameters for URL fetch');
    };

    // ── JSON export ───────────────────────────────────────────────────────────
    const exportAsJSON = async () => {
        setExporting(true);
        try {
            if (type === 'single') {
                const data = await fetchSingleAudit();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                saveAs(blob, `audit_${auditId}_${Date.now()}.json`);
            } else {
                // Export all audits as a JSON array
                const data = await fetchAllAudits();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const safeName = (url || '').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                saveAs(blob, `audits_${safeName}_${Date.now()}.json`);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export audit data');
        } finally {
            setExporting(false);
        }
    };

    // ── CSV export ────────────────────────────────────────────────────────────
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
            const response = await API.get(endpoint, { responseType: 'blob' });
            const filename = type === 'single'
                ? `audit_${auditId}_${Date.now()}.csv`
                : `audits_${(url || '').replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${Date.now()}.csv`;
            saveAs(response.data, filename);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export CSV');
        } finally {
            setExporting(false);
        }
    };

    // ── PDF helpers ───────────────────────────────────────────────────────────
    const getStatus = (metric, value) => {
        if (value === null || value === undefined) return 'No Data';
        switch (metric) {
            case 'lcp':  return value < 2500 ? 'Good' : value < 4000 ? 'Needs Improvement' : 'Poor';
            case 'fcp':  return value < 1800 ? 'Good' : value < 3000 ? 'Needs Improvement' : 'Poor';
            case 'ttfb': return value === 0 ? 'Not Measured' : value < 800 ? 'Good' : value < 1800 ? 'Needs Improvement' : 'Poor';
            case 'cls':  return value < 0.1 ? 'Good' : value < 0.25 ? 'Needs Improvement' : 'Poor';
            case 'tbt':  return value < 300 ? 'Good' : value < 600 ? 'Needs Improvement' : 'Poor';
            default:     return 'N/A';
        }
    };

    const statusColor = (status) => {
        if (status === 'Good' || status === 'Normal') return [40, 167, 69];
        if (status === 'Needs Improvement')           return [255, 153, 0];
        if (status === 'Poor' || status === 'High')   return [220, 53, 69];
        return [150, 150, 150];
    };

    const drawHeader = (doc, pageW, margin) => {
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setFillColor(118, 75, 162);
        doc.rect(pageW * 0.6, 0, pageW * 0.4, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Web Performance Dashboard', margin, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Audit Report', margin, 20);
        doc.setFontSize(8);
        doc.text(new Date().toLocaleString(), pageW - margin, 20, { align: 'right' });
    };

    const drawFooter = (doc) => {
        const totalPages = doc.internal.getNumberOfPages();
        const pageW = doc.internal.pageSize.getWidth();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(180, 180, 180);
            doc.text(
                `Web Performance Dashboard  •  Page ${i} of ${totalPages}  •  Generated ${new Date().toLocaleString()}`,
                pageW / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
        }
    };

    const drawMetricsTable = (doc, audit, startY, margin, pageW) => {
        const metrics = [
            { label: 'LCP',      key: 'lcp',      val: audit.lcp   ? `${(audit.lcp  /1000).toFixed(2)}s` : 'N/A', target: '< 2.5s', full: 'Largest Contentful Paint' },
            { label: 'FCP',      key: 'fcp',      val: audit.fcp   ? `${(audit.fcp  /1000).toFixed(2)}s` : 'N/A', target: '< 1.8s', full: 'First Contentful Paint' },
            { label: 'TTFB',     key: 'ttfb',     val: audit.ttfb  ? `${(audit.ttfb /1000).toFixed(2)}s` : 'N/A', target: '< 0.8s', full: 'Time to First Byte' },
            { label: 'CLS',      key: 'cls',      val: audit.cls !== undefined ? audit.cls.toFixed(3) : 'N/A',      target: '< 0.1',  full: 'Cumulative Layout Shift' },
            { label: 'TBT',      key: 'tbt',      val: audit.tbt   ? `${(audit.tbt  /1000).toFixed(2)}s` : 'N/A', target: '< 0.3s', full: 'Total Blocking Time' },
            { label: 'Requests', key: 'requests', val: String(audit.requests || 0),                                 target: '< 50',   full: 'Total Network Requests' },
        ];

        autoTable(doc, {
            startY,
            margin: { left: margin, right: margin },
            head: [['Metric', 'Description', 'Value', 'Target', 'Status']],
            body: metrics.map(m => {
                const status = m.key === 'requests'
                    ? (audit.requests > 100 ? 'High' : 'Normal')
                    : getStatus(m.key, audit[m.key]);
                return [m.label, m.full, m.val, m.target, status];
            }),
            headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 20 },
                1: { cellWidth: 55 },
                2: { halign: 'center', cellWidth: 22 },
                3: { halign: 'center', cellWidth: 22 },
                4: { halign: 'center', cellWidth: 28 },
            },
            didDrawCell: (data) => {
                if (data.column.index === 4 && data.section === 'body') {
                    const st = data.cell.raw;
                    doc.setFillColor(...statusColor(st));
                    const pad = 2;
                    doc.roundedRect(
                        data.cell.x + pad, data.cell.y + pad,
                        data.cell.width - pad * 2, data.cell.height - pad * 2,
                        2, 2, 'F'
                    );
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.text(st, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
                }
            },
            alternateRowStyles: { fillColor: [248, 249, 250] },
        });
    };

    const drawAISummary = (doc, audit, y, margin, pageW) => {
        const summary = audit.ai_summary;
        if (!summary) return y;

        if (y > 220) { doc.addPage(); y = 20; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('AI Performance Analysis', margin, y);
        y += 6;

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);

        const lines = doc.splitTextToSize(summary, pageW - margin * 2 - 4);
        const boxH = lines.length * 5 + 8;

        doc.setFillColor(245, 247, 255);
        doc.roundedRect(margin, y, pageW - margin * 2, boxH, 3, 3, 'F');
        doc.setDrawColor(102, 126, 234);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + boxH);
        doc.text(lines, margin + 4, y + 6);

        return y + boxH + 8;
    };

    // ── PDF export — single audit ─────────────────────────────────────────────
    const exportSinglePDF = async (audit) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 15;

        drawHeader(doc, pageW, margin);
        let y = 36;

        // URL & score
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Audited URL', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(102, 126, 234);
        const auditDate = audit.created_at ? new Date(audit.created_at).toLocaleString() : '';
        doc.text(`${audit.url || 'N/A'}  —  ${auditDate}`, margin, y + 6);

        const score = audit.performance_score || 0;
        const scoreColor = score >= 90 ? [40,167,69] : score >= 70 ? [23,162,184] : score >= 50 ? [255,193,7] : score >= 30 ? [253,126,20] : [220,53,69];
        doc.setFillColor(...scoreColor);
        doc.roundedRect(pageW - margin - 28, y - 6, 28, 16, 3, 3, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(`${score}`, pageW - margin - 14, y + 5, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text('/ 100', pageW - margin - 14, y + 10, { align: 'center' });

        y += 20;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y);
        y += 8;

        doc.setTextColor(50,50,50); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('Performance Metrics', margin, y);
        y += 6;

        drawMetricsTable(doc, audit, y, margin, pageW);
        y = doc.lastAutoTable.finalY + 10;
        y = drawAISummary(doc, audit, y, margin, pageW);

        drawFooter(doc);

        const safeName = (audit.url || 'audit').replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
        doc.save(`audit_${safeName}_${Date.now()}.pdf`);
    };

    // ── PDF export — ALL audits for a URL ─────────────────────────────────────
    const exportAllPDF = async (audits) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 15;

        drawHeader(doc, pageW, margin);
        let y = 36;

        // Title + URL
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('All Audits Report', margin, y);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 126, 234);
        doc.text(url || '', margin, y + 6);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(`${audits.length} audit${audits.length !== 1 ? 's' : ''} total`, margin, y + 12);
        y += 20;

        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y);
        y += 8;

        // Summary table of all audits
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('Audit Summary', margin, y);
        y += 6;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['#', 'Date', 'Score', 'LCP', 'FCP', 'TTFB', 'CLS', 'TBT', 'Req']],
            body: audits.map((a, i) => [
                i + 1,
                a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A',
                `${a.performance_score}/100`,
                a.lcp   ? `${(a.lcp  /1000).toFixed(2)}s` : 'N/A',
                a.fcp   ? `${(a.fcp  /1000).toFixed(2)}s` : 'N/A',
                a.ttfb  ? `${(a.ttfb /1000).toFixed(2)}s` : 'N/A',
                a.cls !== undefined ? a.cls.toFixed(3) : 'N/A',
                a.tbt   ? `${(a.tbt  /1000).toFixed(2)}s` : 'N/A',
                a.requests || 0,
            ]),
            headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                2: { halign: 'center', cellWidth: 18 },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center', cellWidth: 12 },
            },
            didDrawCell: (data) => {
                if (data.column.index === 2 && data.section === 'body') {
                    const score = parseInt(data.cell.raw);
                    const color = score >= 90 ? [40,167,69] : score >= 70 ? [23,162,184] : score >= 50 ? [255,193,7] : [220,53,69];
                    doc.setTextColor(...color);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(data.cell.raw,
                        data.cell.x + data.cell.width / 2,
                        data.cell.y + data.cell.height / 2 + 1,
                        { align: 'center' }
                    );
                }
            },
            alternateRowStyles: { fillColor: [248, 249, 250] },
        });

        // Individual audit sections with AI summaries
        audits.forEach((audit, index) => {
            if (!audit.ai_summary) return;

            doc.addPage();
            let ay = 15;

            // Audit header
            doc.setFillColor(245, 247, 255);
            doc.rect(0, 0, pageW, 14, 'F');
            doc.setTextColor(102, 126, 234);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(`Audit #${index + 1}  —  ${audit.created_at ? new Date(audit.created_at).toLocaleString() : ''}`, margin, 9);

            const sc = audit.performance_score || 0;
            const scColor = sc >= 90 ? [40,167,69] : sc >= 70 ? [23,162,184] : sc >= 50 ? [255,193,7] : sc >= 30 ? [253,126,20] : [220,53,69];
            doc.setTextColor(...scColor);
            doc.setFontSize(10);
            doc.text(`Score: ${sc}/100`, pageW - margin, 9, { align: 'right' });

            ay = 22;

            drawMetricsTable(doc, audit, ay, margin, pageW);
            ay = doc.lastAutoTable.finalY + 8;
            drawAISummary(doc, audit, ay, margin, pageW);
        });

        drawFooter(doc);

        const safeName = (url || 'audits').replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        doc.save(`all_audits_${safeName}_${Date.now()}.pdf`);
    };

    // ── Main PDF export dispatcher ────────────────────────────────────────────
    const exportAsPDF = async () => {
        setExporting(true);
        try {
            if (type === 'single') {
                const audit = await fetchSingleAudit();
                await exportSinglePDF(audit);
            } else {
                const audits = await fetchAllAudits();
                await exportAllPDF(audits);
            }
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    // ── Button styles ─────────────────────────────────────────────────────────
    const btnBase = {
        padding: '5px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'opacity 0.2s',
        opacity: exporting ? 0.6 : 1,
        letterSpacing: '0.3px',
    };

    return (
        <div style={{ display: 'flex', gap: '6px' }}>
            <button
                onClick={exportAsJSON}
                disabled={exporting}
                style={{ ...btnBase, backgroundColor: '#2196f3', color: 'white' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                {exporting ? '...' : 'JSON'}
            </button>
            <button
                onClick={exportAsCSV}
                disabled={exporting}
                style={{ ...btnBase, backgroundColor: '#4caf50', color: 'white' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                {exporting ? '...' : 'CSV'}
            </button>
            <button
                onClick={exportAsPDF}
                disabled={exporting}
                style={{ ...btnBase, backgroundColor: '#e53935', color: 'white' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                {exporting ? '...' : 'PDF'}
            </button>
        </div>
    );
};

export default ExportButton;