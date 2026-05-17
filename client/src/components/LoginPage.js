import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
    const { login, register } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let result;
            if (mode === 'login') {
                result = await login(form.email, form.password);
            } else {
                if (!form.username.trim()) {
                    setError('Please enter a username');
                    setLoading(false);
                    return;
                }
                result = await register(form.username, form.email, form.password);
            }

            if (!result.success) {
                setError(result.error || 'Something went wrong');
            }
            // On success, AuthContext updates user → App.js renders Dashboard automatically

        } catch (err) {
            const msg = err.response?.data?.error || 'Could not connect to server';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setError('');
        setForm({ username: '', email: '', password: '' });
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">🚀</div>
                    <h1>Web Performance Dashboard</h1>
                    <p>Analyse, optimise, and monitor your website</p>
                </div>

                {/* Tab switcher */}
                <div className="login-tabs">
                    <button
                        className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => switchMode('login')}
                        type="button"
                    >
                        Sign In
                    </button>
                    <button
                        className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => switchMode('register')}
                        type="button"
                    >
                        Create Account
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="Your name"
                                disabled={loading}
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                                disabled={loading}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                            <button
                                type="button"
                                className="show-password"
                                onClick={() => setShowPassword(p => !p)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            ❌ {error}
                        </div>
                    )}

                    <button type="submit" className="login-submit" disabled={loading}>
                        {loading
                            ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                            : (mode === 'login' ? 'Sign In' : 'Create Account')
                        }
                    </button>
                </form>

                {/* Footer note */}
                <div className="login-footer">
                    {mode === 'register' ? (
                        <p>
                            The <strong>first account registered</strong> becomes the Admin automatically.
                        </p>
                    ) : (
                        <p>Don't have an account? <button className="link-btn" onClick={() => switchMode('register')}>Create one</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
