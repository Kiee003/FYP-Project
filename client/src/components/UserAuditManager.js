import React, { useState, useEffect } from 'react';
import API from '../services/api';
import ExportButton from './ExportButton';
import './UserAuditManager.css';

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Icons = {
    trash: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
    ),
    link: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
    ),
    refresh: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    ),
};

const UserAuditManager = () => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msgText, setMsgText] = useState('');
    const [msgType, setMsgType] = useState('ok'); // 'ok' | 'err'
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [search, setSearch] = useState('');
    const [expandedAudit, setExpandedAudit] = useState(null);

    const showMsg = (text, type = 'ok') => {
        setMsgText(text);
        setMsgType(type);
        setTimeout(() => setMsgText(''), 3000);
    };

    const fetchAudits = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await API.get('/api/audits?limit=100');
            if (res.data.success) setAudits(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load audit data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAudits(); }, []);

    const handleDelete = async (id) => {
        try {
            const res = await API.delete(`/api/audit/${id}`);
            if (res.data.success) {
                setAudits(prev => prev.filter(a => a.id !== id));
                showMsg('Audit deleted successfully', 'ok');
                setConfirmDelete(null);
            }
        } catch (err) {
            showMsg(err.response?.data?.error || 'Delete failed', 'err');
            setConfirmDelete(null);
        }
    };

    const getScoreStyle = (score) => {
        if (score >= 90) return { color: '#16a34a', fontWeight: 700 };
        if (score >= 50) return { color: '#d97706', fontWeight: 700 };
        return { color: '#dc2626', fontWeight: 700 };
    };

    const formatDate = (dt) => new Date(dt).toLocaleString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const filtered = audits.filter(a =>
        !search ||
        a.url?.toLowerCase().includes(search.toLowerCase()) ||
        a.username?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="uam">

            {/* Message bar */}
            {msgText && (
                <div className={`uam__msg ${msgType === 'ok' ? 'uam__msg--ok' : 'uam__msg--err'}`}>
                    {msgText}
                </div>
            )}

            {error && <div className="uam__msg uam__msg--err">{error}</div>}

            {/* Search row — includes audit count and refresh */}
            <div className="uam__search-row">
                <input
                    className="uam__search"
                    type="text"
                    placeholder="Search by URL, username or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <span className="uam__count">{filtered.length} of {audits.length}</span>
                <button className="uam__refresh" onClick={fetchAudits} title="Refresh data">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {Icons.refresh} Refresh
                    </span>
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="uam__loading">Loading audit data...</div>
            ) : filtered.length === 0 ? (
                <div className="uam__empty">No audits found{search ? ' matching your search' : ''}.</div>
            ) : (
                <div className="uam__table-wrap">
                    <table className="uam__table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>URL</th>
                                <th>Score</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(audit => (
                                <React.Fragment key={audit.id}>
                                    <tr className={expandedAudit === audit.id ? 'uam__row--expanded' : ''}>
                                        <td className="uam__id">#{audit.id}</td>
                                        <td>
                                            <div className="uam__user-cell">
                                                <span className="uam__uname">{audit.username || '—'}</span>
                                                <span className="uam__uemail">{audit.email || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="uam__url-btn"
                                                onClick={() => setExpandedAudit(prev => prev === audit.id ? null : audit.id)}
                                                title={audit.url}
                                            >
                                                {audit.url?.replace(/https?:\/\//, '').substring(0, 35)}
                                                {audit.url?.length > 40 ? '…' : ''}
                                            </button>
                                        </td>
                                        <td>
                                            <span style={getScoreStyle(audit.performance_score)}>
                                                {audit.performance_score}/100
                                            </span>
                                        </td>
                                        <td className="uam__date">{formatDate(audit.created_at)}</td>
                                        <td>
                                            <div className="uam__actions">
                                                {/* JSON + CSV + PDF via ExportButton */}
                                                <ExportButton auditId={audit.id} type="single" />

                                                {/* Delete */}
                                                {confirmDelete === audit.id ? (
                                                    <div className="uam__confirm">
                                                        <button className="uam__btn uam__btn--yes" onClick={() => handleDelete(audit.id)}>Yes</button>
                                                        <button className="uam__btn uam__btn--no"  onClick={() => setConfirmDelete(null)}>No</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="uam__btn uam__btn--del"
                                                        onClick={() => setConfirmDelete(audit.id)}
                                                        title="Delete audit"
                                                    >
                                                        {Icons.trash}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded detail row */}
                                    {expandedAudit === audit.id && (
                                        <tr className="uam__detail-row">
                                            <td colSpan={6}>
                                                <div className="uam__detail">
                                                    <div className="uam__detail-url">
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#667eea' }}>
                                                            {Icons.link}
                                                        </span>
                                                        {audit.url}
                                                    </div>
                                                    <div className="uam__metrics">
                                                        {[
                                                            { label: 'LCP',  val: `${(audit.lcp  / 1000).toFixed(2)}s` },
                                                            { label: 'FCP',  val: `${(audit.fcp  / 1000).toFixed(2)}s` },
                                                            { label: 'TTFB', val: `${(audit.ttfb / 1000).toFixed(2)}s` },
                                                            { label: 'CLS',  val: audit.cls?.toFixed(3) },
                                                            { label: 'TBT',  val: `${(audit.tbt  / 1000).toFixed(2)}s` },
                                                            { label: 'Reqs', val: audit.requests },
                                                        ].map(m => (
                                                            <div key={m.label} className="uam__metric-chip">
                                                                <span className="uam__metric-label">{m.label}</span>
                                                                <span className="uam__metric-val">{m.val}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {audit.ai_summary && (
                                                        <div className="uam__ai-summary">
                                                            <strong>AI Summary:</strong> {audit.ai_summary.substring(0, 300)}{audit.ai_summary.length > 300 ? '…' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserAuditManager;