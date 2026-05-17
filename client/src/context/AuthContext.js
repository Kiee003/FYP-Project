import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    // Set axios default auth header whenever token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('auth_token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('auth_token');
        }
    }, [token]);

    // Verify stored token on app load
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`${API_BASE}/auth/me`);
                if (res.data.success) {
                    setUser(res.data.user);
                } else {
                    logout();
                }
            } catch {
                logout();
            } finally {
                setLoading(false);
            }
        };
        verifyToken();
    }, []); // eslint-disable-line

    const login = async (email, password) => {
        const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
        if (res.data.success) {
            setToken(res.data.token);
            setUser(res.data.user);
        }
        return res.data;
    };

    const register = async (username, email, password) => {
        const res = await axios.post(`${API_BASE}/auth/register`, { username, email, password });
        if (res.data.success) {
            setToken(res.data.token);
            setUser(res.data.user);
        }
        return res.data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    // Role helpers
    const isAdmin = user?.role === 'admin';
    const isModerator = user?.role === 'moderator' || user?.role === 'admin';
    const isNormal = user?.role === 'normal';

    const can = (action) => {
        if (!user) return false;
        const permissions = {
            normal:    ['run_audit', 'own_history', 'crawler', 'export_own'],
            moderator: ['run_audit', 'own_history', 'crawler', 'export_own', 'all_history', 'user_list', 'delete_audit', 'export_all'],
            admin:     ['run_audit', 'own_history', 'crawler', 'export_own', 'all_history', 'user_list', 'delete_audit', 'export_all', 'manage_users', 'change_roles', 'server_stats'],
        };
        return permissions[user.role]?.includes(action) || false;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isModerator, isNormal, can }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export default AuthContext;
