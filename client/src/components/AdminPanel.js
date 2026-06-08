import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import './AdminPanel.css';

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Icons = {
    admin: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    ),
    moderator: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    ),
    user: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    trash: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

const ROLE_CONFIG = {
    admin:     { label: 'Admin',     color: '#dc3545', bg: '#f8d7da', icon: Icons.admin     },
    moderator: { label: 'Moderator', color: '#856404', bg: '#fff3cd', icon: Icons.moderator },
    normal:    { label: 'User',      color: '#0c5460', bg: '#d1ecf1', icon: Icons.user      },
};

// onClose is kept as prop for backward compatibility but not used visually
const AdminPanel = ({ onClose }) => {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msgText, setMsgText] = useState('');
    const [msgType, setMsgType] = useState('success');
    const [confirmDelete, setConfirmDelete] = useState(null);

    const showMsg = (text, type = 'success') => {
        setMsgText(text);
        setMsgType(type);
        setTimeout(() => setMsgText(''), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await API.get('/api/auth/users');
            if (res.data.success) setUsers(res.data.users);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await API.put(`/api/auth/users/${userId}/role`, { role: newRole });
            if (res.data.success) {
                showMsg(`Role updated to ${newRole}`, 'success');
                fetchUsers();
            }
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to update role', 'error');
        }
    };

    const handleDelete = async (userId) => {
        try {
            const res = await API.delete(`/api/auth/users/${userId}`);
            if (res.data.success) {
                showMsg('User deleted successfully', 'success');
                setConfirmDelete(null);
                fetchUsers();
            }
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to delete user', 'error');
            setConfirmDelete(null);
        }
    };

    const formatDate = (dt) => {
        if (!dt) return 'Never';
        return new Date(dt).toLocaleDateString('en-MY', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    return (
        <div className="admin-panel">

            {/* Action message */}
            {msgText && (
                <div className={`action-message ${msgType}`}>
                    {msgText}
                </div>
            )}

            {error && <div className="action-message error">{error}</div>}

            {/* Subheader row — user count + refresh */}
            <div className="admin-subheader">
                <span className="admin-user-count">
                    {users.length} registered account{users.length !== 1 ? 's' : ''}
                </span>
                <button className="admin-refresh" onClick={fetchUsers} title="Refresh">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {Icons.refresh} Refresh
                    </span>
                </button>
            </div>

            {/* User table */}
            <div className="admin-body">
                {loading ? (
                    <div className="admin-loading">Loading users...</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Audits</th>
                                <th>Joined</th>
                                <th>Last Login</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => {
                                const roleInfo = ROLE_CONFIG[u.role] || ROLE_CONFIG.normal;
                                const isSelf = u.id === user.id;

                                return (
                                    <tr key={u.id} className={isSelf ? 'self-row' : ''}>

                                        {/* User info */}
                                        <td>
                                            <div className="user-cell">
                                                <div className="table-avatar" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                                                    {u.username?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="table-username">
                                                        {u.username}
                                                        {isSelf && <span className="you-badge">you</span>}
                                                    </div>
                                                    <div className="table-email">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td>
                                            {isAdmin && !isSelf ? (
                                                <select
                                                    className="role-select"
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    style={{ color: roleInfo.color, borderColor: roleInfo.color }}
                                                >
                                                    <option value="normal">User</option>
                                                    <option value="moderator">Moderator</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className="role-tag" style={{ color: roleInfo.color, background: roleInfo.bg }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}>
                                                        {roleInfo.icon}
                                                    </span>
                                                    {roleInfo.label}
                                                </span>
                                            )}
                                        </td>

                                        <td className="text-center">{u.audit_count || 0}</td>
                                        <td className="text-muted">{formatDate(u.created_at)}</td>
                                        <td className="text-muted">{formatDate(u.last_login)}</td>

                                        {/* Delete — admin only, can't delete self */}
                                        {isAdmin && (
                                            <td>
                                                {!isSelf && (
                                                    confirmDelete === u.id ? (
                                                        <div className="confirm-delete">
                                                            <span>Delete?</span>
                                                            <button className="btn-confirm-yes" onClick={() => handleDelete(u.id)}>Yes</button>
                                                            <button className="btn-confirm-no"  onClick={() => setConfirmDelete(null)}>No</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="btn-delete"
                                                            onClick={() => setConfirmDelete(u.id)}
                                                            title="Delete user"
                                                        >
                                                            {Icons.trash}
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Permissions legend */}
            <div className="admin-footer">
                <div className="role-legend">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: ROLE_CONFIG.normal.color, fontWeight: 600 }}>
                        {Icons.user} User
                    </span>
                    — run audits, own history
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: ROLE_CONFIG.moderator.color, fontWeight: 600 }}>
                        {Icons.moderator} Moderator
                    </span>
                    — + all history, delete audits
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: ROLE_CONFIG.admin.color, fontWeight: 600 }}>
                        {Icons.admin} Admin
                    </span>
                    — + manage accounts
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;