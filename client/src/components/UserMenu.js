import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPanel from './AdminPanel';
import './UserMenu.css';

const ROLE_CONFIG = {
    admin:     { label: 'Admin',     color: '#dc3545', bg: '#f8d7da', icon: '👑' },
    moderator: { label: 'Moderator', color: '#856404', bg: '#fff3cd', icon: '🛡️' },
    normal:    { label: 'User',      color: '#0c5460', bg: '#d1ecf1', icon: '👤' },
};

const UserMenu = () => {
    const { user, logout, isModerator } = useAuth();
    const [open, setOpen] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);

    if (!user) return null;

    const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.normal;

    const handleLogout = () => {
        setOpen(false);
        logout();
    };

    const handleOpenAdmin = () => {
        setOpen(false);
        setShowAdmin(true);
    };

    return (
        <>
            <div className="user-menu-wrapper">
                <button
                    className="user-menu-trigger"
                    onClick={() => setOpen(prev => !prev)}
                >
                    <div className="user-avatar">{user.username?.[0]?.toUpperCase() || '?'}</div>
                    <div className="user-info">
                        <span className="user-name">{user.username}</span>
                        <span className="user-role-badge" style={{ color: role.color, background: role.bg }}>
                            {role.icon} {role.label}
                        </span>
                    </div>
                    <span className="chevron">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                    <>
                        <div className="menu-backdrop" onClick={() => setOpen(false)} />
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <p className="dropdown-username">{user.username}</p>
                                <p className="dropdown-email">{user.email}</p>
                                <span className="dropdown-role" style={{ color: role.color, background: role.bg }}>
                                    {role.icon} {role.label}
                                </span>
                            </div>

                            <div className="dropdown-divider" />

                            {/* Only visible to moderator and admin */}
                            {isModerator && (
                                <button className="dropdown-item" onClick={handleOpenAdmin}>
                                    ⚙️ Manage Users
                                </button>
                            )}

                            <button className="dropdown-item logout-item" onClick={handleLogout}>
                                🚪 Sign Out
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        </>
    );
};

export default UserMenu;