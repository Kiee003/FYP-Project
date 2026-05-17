import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import './AdminPanel.css';

const ROLE_CONFIG = {
    admin:     { label: 'Admin',     color: '#dc3545', bg: '#f8d7da', icon: '👑' },
    moderator: { label: 'Moderator', color: '#856404', bg: '#fff3cd', icon: '🛡️' },
    normal:    { label: 'User',      color: '#0c5460', bg: '#d1ecf1', icon: '👤' },
};

const AdminPanel = ({ onClose }) => {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null); // userId pending delete

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

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await API.put(`/api/auth/users/${userId}/role`, { role: newRole });
            if (res.data.success) {
                setActionMsg(`✅ Role updated to ${newRole}`);
                fetchUsers();
                setTimeout(() => setActionMsg(''), 3000);
            }
        } catch (err) {
            setActionMsg(`❌ ${err.response?.data?.error || 'Failed to update role'}`);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    const handleDelete = async (userId) => {
        try {
            const res = await API.delete(`/api/auth/users/${userId}`);
            if (res.data.success) {
                setActionMsg('✅ User deleted');
                setConfirmDelete(null);
                fetchUsers();
                setTimeout(() => setActionMsg(''), 3000);
            }
        } catch (err) {
            setActionMsg(`❌ ${err.response?.data?.error || 'Failed to delete user'}`);
            setConfirmDelete(null);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    const formatDate = (dt) => {
        if (!dt) return 'Never';
        return new Date(dt).toLocaleDateString('en-MY', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="admin-overlay">
            <div className="admin-panel">
                {/* Header */}
                <div className="admin-header">
                    <div>
                        <h2>⚙️ User Management</h2>
                        <p>{users.length} registered account{users.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="admin-close" onClick={onClose}>✕</button>
                </div>

                {actionMsg && (
                    <div className={`action-message ${actionMsg.startsWith('✅') ? 'success' : 'error'}`}>
                        {actionMsg}
                    </div>
                )}

                {error && <div className="action-message error">{error}</div>}

                {/* User Table */}
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

                                            {/* Role — admin can change, moderator can only view */}
                                            <td>
                                                {isAdmin && !isSelf ? (
                                                    <select
                                                        className="role-select"
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        style={{ color: roleInfo.color, borderColor: roleInfo.color }}
                                                    >
                                                        <option value="normal">👤 User</option>
                                                        <option value="moderator">🛡️ Moderator</option>
                                                        <option value="admin">👑 Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className="role-tag" style={{ color: roleInfo.color, background: roleInfo.bg }}>
                                                        {roleInfo.icon} {roleInfo.label}
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
                                                                <span>Sure?</span>
                                                                <button className="btn-confirm-yes" onClick={() => handleDelete(u.id)}>Yes</button>
                                                                <button className="btn-confirm-no" onClick={() => setConfirmDelete(null)}>No</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="btn-delete"
                                                                onClick={() => setConfirmDelete(u.id)}
                                                                title="Delete user"
                                                            >
                                                                🗑️
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
                        <span style={{ color: ROLE_CONFIG.normal.color }}>👤 User</span> — run audits, own history
                        <span style={{ color: ROLE_CONFIG.moderator.color }}>🛡️ Moderator</span> — + all history, delete audits
                        <span style={{ color: ROLE_CONFIG.admin.color }}>👑 Admin</span> — + manage accounts
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
