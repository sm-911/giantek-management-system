import { useState, useEffect, useRef } from 'react';
import { MdNotifications, MdNotificationsNone, MdClose, MdDoneAll } from 'react-icons/md';
import api from '../api/axios';
import { timeAgo } from '../utils/helpers';
import { toast } from 'react-toastify';

const POLL_INTERVAL = 30000; // Poll every 30 seconds

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* silent fail */ }
  };

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch { toast.error('Failed to mark notifications as read.'); }
  };

  const dismiss = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const typeIcon = (type) => {
    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    return icons[type] || 'ℹ️';
  };

  return (
    <div className="notif-wrapper" ref={panelRef}>
      {/* Bell button */}
      <button
        className="navbar__icon-btn notif-bell"
        onClick={() => setIsOpen(o => !o)}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? <MdNotifications size={20} /> : <MdNotificationsNone size={20} />}
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="notif-panel">
          <div className="notif-panel__header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-panel__mark-all" onClick={markAllRead} title="Mark all read">
                <MdDoneAll size={16} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-panel__list">
            {notifications.length === 0 ? (
              <div className="notif-panel__empty">
                <MdNotificationsNone size={36} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <span className="notif-item__icon">{typeIcon(n.type)}</span>
                  <div className="notif-item__content">
                    <p className="notif-item__title">{n.title}</p>
                    <p className="notif-item__msg">{n.message}</p>
                    <p className="notif-item__time">{timeAgo(n.created_at)}</p>
                  </div>
                  <button className="notif-item__dismiss" onClick={(e) => dismiss(n.id, e)} title="Dismiss">
                    <MdClose size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
