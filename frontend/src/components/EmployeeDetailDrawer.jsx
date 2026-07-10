import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency, getErrorMessage } from '../utils/helpers';
import {
  MdClose, MdWork, MdCurrencyRupee, MdAccessTime,
  MdCheckCircle, MdPending
} from 'react-icons/md';

const PERIOD_TABS = [
  { id: 'all',     label: 'All Time' },
  { id: 'weekly',  label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'yearly',  label: 'This Year' },
];

const STAT_COLOR = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9'];

const EmployeeDetailDrawer = ({ employee, onClose }) => {
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('work'); // 'work' | 'revenue'

  const fetchStats = async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/employees/${employee.id}/history?period=${p}`);
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employee) fetchStats(period);
  }, [employee, period]);

  if (!employee) return null;

  const stats = data?.stats ?? {};

  const statCards = [
    { label: 'Tasks Done',   value: stats.completed_tasks ?? 0,      icon: <MdCheckCircle size={18} />,  color: '#10b981' },
    { label: 'In Progress',  value: stats.in_progress_tasks ?? 0,    icon: <MdPending size={18} />,      color: '#f59e0b' },
    { label: 'Hours Logged', value: `${Number(stats.total_hours ?? 0).toFixed(1)} hrs`, icon: <MdAccessTime size={18} />,    color: '#6366f1' },
    { label: 'Revenue',      value: formatCurrency(stats.total_revenue ?? 0), icon: <MdCurrencyRupee size={18} />, color: '#0ea5e9' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)', zIndex: 200
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh',
        width: 'min(620px, 100vw)', background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.35)',
        animation: 'slideInRight .25s ease'
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, color: '#fff'
          }}>
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{employee.name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{employee.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <MdClose size={22} />
          </button>
        </div>

        {/* ── Period Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
          {PERIOD_TABS.map(t => (
            <button key={t.id} onClick={() => setPeriod(t.id)} style={{
              flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, background: 'none', transition: 'all .2s',
              color: period === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: period === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Content Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'work',    label: `Work Entries (${data?.work_entries?.length ?? 0})`, icon: <MdWork size={14} /> },
            { id: 'revenue', label: `Revenue (${data?.revenue?.length ?? 0})`,           icon: <MdCurrencyRupee size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: 'none', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all .2s',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading...
            </div>
          ) : tab === 'work' ? (
            !data?.work_entries?.length ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No work entries for {data?.periodLabel ?? 'this period'}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.work_entries.map(w => (
                  <div key={w.id} style={{
                    background: 'var(--bg-main)', borderRadius: '12px',
                    padding: '12px 14px', border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="tag">{w.work_type}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                          color: w.status === 'completed' ? '#10b981' : '#f59e0b',
                          background: w.status === 'completed' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)'
                        }}>
                          {w.status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: w.priority === 'Urgent' ? '#ef4444' : w.priority === 'High' ? '#f97316' : 'var(--text-secondary)' }}>
                          {w.priority}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDate(w.work_date)}</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                      <span>🏢 {w.client_name}</span>
                      <span>⏱ {w.time_taken} hrs</span>
                      {w.misc_description && <span>📝 {w.misc_description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            !data?.revenue?.length ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No revenue records for {data?.periodLabel ?? 'this period'}.
              </div>
            ) : (
              <>
                <div style={{
                  background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
                  borderRadius: '12px', padding: '12px 16px', marginBottom: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Total Revenue — {data?.periodLabel}
                  </span>
                  <strong style={{ fontSize: '20px', color: '#10b981' }}>
                    {formatCurrency(stats.total_revenue ?? 0)}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.revenue.map(r => (
                    <div key={r.id} style={{
                      background: 'var(--bg-main)', borderRadius: '12px',
                      padding: '12px 14px', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="tag">{r.work_type}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🏢 {r.client_name}</span>
                        </div>
                        {r.notes && <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.notes}</p>}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{formatDate(r.created_at)}</span>
                      </div>
                      <strong style={{ fontSize: '17px', color: '#10b981', flexShrink: 0 }}>{formatCurrency(r.value)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default EmployeeDetailDrawer;
