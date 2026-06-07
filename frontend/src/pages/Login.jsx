import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/helpers';

const Login = () => {
  const [tab, setTab] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ email: '', token: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Request sent! Contact your admin for the reset token.');
      setTab('reset');
      setResetForm(p => ({ ...p, email: forgotEmail }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (resetForm.new_password !== resetForm.confirm) {
      toast.error('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: resetForm.email,
        token: resetForm.token,
        new_password: resetForm.new_password
      });
      toast.success('Password reset! Please log in.');
      setTab('login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-page__bg">
        <div className="login-page__blob login-page__blob--1" />
        <div className="login-page__blob login-page__blob--2" />
        <div className="login-page__blob login-page__blob--3" />
      </div>

      <div className="login-card">
        {/* Brand */}
        <div className="login-card__brand">
          <img src="/logo-icon.png" alt="Giantek Logo" className="login-card__logo-img" />
          <div className="login-card__brand-text">
            <h1 className="login-card__company">GIANTEK CONSULTANCY SERVICES</h1>
            <div className="login-card__divider" />
            <p className="login-card__tagline">Think Different</p>
          </div>
        </div>

        {/* ── Login Form ──────────────────────────────────────────────── */}
        {tab === 'login' && (
          <>
            <h2 className="login-card__title">Sign In</h2>
            <form onSubmit={handleLogin} className="form">
              <div className="form__group">
                <label className="form__label">Email Address</label>
                <input id="login-email" className="form__input" type="email" required autoFocus
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@giantek.com" />
              </div>
              <div className="form__group">
                <label className="form__label">Password</label>
                <input id="login-password" className="form__input" type="password" required
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Enter your password" />
              </div>
              <button id="login-submit" type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? <span className="spinner spinner--sm" /> : 'Sign In'}
              </button>
            </form>
            <button className="login-card__link" onClick={() => setTab('forgot')}>
              Forgot password?
            </button>
          </>
        )}

        {/* ── Forgot Password Form ──────────────────────────────────── */}
        {tab === 'forgot' && (
          <>
            <h2 className="login-card__title">Forgot Password</h2>
            <p className="login-card__sub">Enter your email to submit a reset request. Your admin will provide a token.</p>
            <form onSubmit={handleForgot} className="form">
              <div className="form__group">
                <label className="form__label">Email Address</label>
                <input className="form__input" type="email" required autoFocus
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@giantek.com" />
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? 'Sending...' : 'Submit Request'}
              </button>
            </form>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
              <button className="login-card__link" onClick={() => setTab('login')}>← Back to Login</button>
              <button className="login-card__link" onClick={() => setTab('reset')}>I have a token →</button>
            </div>
          </>
        )}

        {/* ── Reset Password Form ───────────────────────────────────── */}
        {tab === 'reset' && (
          <>
            <h2 className="login-card__title">Reset Password</h2>
            <p className="login-card__sub">Enter the token provided by your admin and your new password.</p>
            <form onSubmit={handleReset} className="form">
              <div className="form__group">
                <label className="form__label">Email Address</label>
                <input className="form__input" type="email" required
                  value={resetForm.email}
                  onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com" />
              </div>
              <div className="form__group">
                <label className="form__label">Reset Token (from Admin)</label>
                <input className="form__input" required
                  value={resetForm.token}
                  onChange={e => setResetForm(p => ({ ...p, token: e.target.value.toUpperCase() }))}
                  placeholder="e.g. A3X9F2B7" style={{ letterSpacing: '0.2em', fontWeight: 700 }} />
              </div>
              <div className="form__group">
                <label className="form__label">New Password</label>
                <input className="form__input" type="password" required minLength={6}
                  value={resetForm.new_password}
                  onChange={e => setResetForm(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="Min. 6 characters" />
              </div>
              <div className="form__group">
                <label className="form__label">Confirm New Password</label>
                <input className="form__input" type="password" required
                  value={resetForm.confirm}
                  onChange={e => setResetForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password" />
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <button className="login-card__link" onClick={() => setTab('login')}>← Back to Login</button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
