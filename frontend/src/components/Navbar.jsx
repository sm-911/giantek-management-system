import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationPanel from './NotificationPanel';
import api from '../api/axios';
import {
  MdMenu, MdLightMode, MdDarkMode,
  MdLogout, MdPerson, MdLock
} from 'react-icons/md';
import { toast } from 'react-toastify';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);
  const profileRef = useRef();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully.');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setPassLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passForm.current_password,
        new_password: passForm.new_password
      });
      toast.success('Password changed successfully!');
      setShowChangePass(false);
      setPassForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <>
      <header className="navbar">
        {/* Left: hamburger menu (mobile) */}
        <button className="navbar__menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <MdMenu size={22} />
        </button>

        {/* Center: page title area */}
        <div className="navbar__title">
          <span>Giantek</span>
          <span className="navbar__title-role">{user?.role === 'admin' ? 'Admin Panel' : 'Employee Portal'}</span>
        </div>

        {/* Right: controls */}
        <div className="navbar__right">
          {/* Theme toggle */}
          <button className="navbar__icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
          </button>

          {/* Notifications */}
          <NotificationPanel />

          {/* Profile dropdown */}
          <div className="navbar__profile" ref={profileRef}>
            <button
              className="navbar__avatar"
              onClick={() => setShowProfile(p => !p)}
              aria-label="Profile menu"
            >
              {initials}
            </button>

            {showProfile && (
              <div className="dropdown">
                <div className="dropdown__header">
                  <div className="dropdown__avatar">{initials}</div>
                  <div>
                    <p className="dropdown__name">{user?.name}</p>
                    <p className="dropdown__email">{user?.email}</p>
                  </div>
                </div>
                <div className="dropdown__divider" />
                <button className="dropdown__item" onClick={() => { setShowChangePass(true); setShowProfile(false); }}>
                  <MdLock size={16} /> Change Password
                </button>
                <button className="dropdown__item dropdown__item--danger" onClick={handleLogout}>
                  <MdLogout size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePass && (
        <div className="modal-overlay" onClick={() => setShowChangePass(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Change Password</h2>
              <button className="modal__close" onClick={() => setShowChangePass(false)}>✕</button>
            </div>
            <form onSubmit={handleChangePassword} className="form">
              <div className="form__group">
                <label className="form__label">Current Password</label>
                <input className="form__input" type="password" required
                  value={passForm.current_password}
                  onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="form__group">
                <label className="form__label">New Password</label>
                <input className="form__input" type="password" required minLength={6}
                  value={passForm.new_password}
                  onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div className="form__group">
                <label className="form__label">Confirm New Password</label>
                <input className="form__input" type="password" required
                  value={passForm.confirm}
                  onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                />
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={() => setShowChangePass(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={passLoading}>
                  {passLoading ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
