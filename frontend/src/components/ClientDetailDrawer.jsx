import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency, getErrorMessage, getStatusColor, getStatusLabel, getPriorityColor } from '../utils/helpers';
import { MdClose, MdWork, MdCurrencyRupee, MdAccessTime, MdCheckCircle } from 'react-icons/md';

const ClientDetailDrawer = ({ client, onClose }) => {
  const [tab, setTab] = useState('work');
  const [workEntries, setWorkEntries] = useState([]);
  const [revenueRecords, setRevenueRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    const fetchClientData = async () => {
      setLoading(true);
      try {
        const [workRes, revRes] = await Promise.all([
          api.get(`/work?client_id=${client.id}`),
          api.get(`/revenue?client_id=${client.id}`)
        ]);
        setWorkEntries(workRes.data);
        setRevenueRecords(revRes.data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchClientData();
  }, [client]);

  if (!client) return null;

  const totalRevenue = revenueRecords.reduce((s, r) => s + r.value, 0);
  const totalHours = workEntries.reduce((s, w) => s + (w.time_taken || 0), 0);
  const completedCount = workEntries.filter(w => w.status === 'completed').length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)', zIndex: 200, animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(600px, 100vw)',
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          zIndex: 201, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: '16px'
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #d4b95a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: '#0f1117'
          }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{client.name}</h2>
            {client.company_name && (
              <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{client.company_name}</p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
              {client.email && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>✉️ {client.email}</span>}
              {client.contact_number && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📞 {client.contact_number}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '4px', borderRadius: '8px',
              display: 'flex', alignItems: 'center'
            }}
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Summary stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)'
        }}>
          {[
            { icon: <MdWork size={18} />, label: 'Work Entries', value: workEntries.length, color: 'var(--primary)' },
            { icon: <MdCurrencyRupee size={18} />, label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'var(--success)' },
            { icon: <MdAccessTime size={18} />, label: 'Hours Logged', value: `${totalHours} hrs`, color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: stat.color, display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '—' : stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
          {[
            { id: 'work', label: `Work Entries (${workEntries.length})` },
            { id: 'revenue', label: `Revenue (${revenueRecords.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: 'none', transition: 'all 0.2s',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading...
            </div>
          ) : tab === 'work' ? (
            workEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No work entries for this client yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {workEntries.map(w => (
                  <div key={w.id} style={{
                    background: 'var(--bg-main)', borderRadius: '12px',
                    padding: '14px 16px', border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="tag">{w.work_type}</span>
                        <span
                          className="status-badge"
                          style={{ color: getStatusColor(w.status), background: `${getStatusColor(w.status)}22`, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}
                        >
                          {getStatusLabel(w.status)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: getPriorityColor(w.priority) }}>
                          {w.priority}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {formatDate(w.work_date)}
                      </span>
                    </div>
                    {w.misc_description && (
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {w.misc_description}
                      </p>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>⏱ {w.time_taken} hrs</span>
                      {w.employees?.length > 0 && (
                        <span>👤 {w.employees.map(e => e.name).join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            revenueRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No revenue records for this client yet.
              </div>
            ) : (
              <>
                {/* Revenue total banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
                  border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px',
                  padding: '14px 18px', marginBottom: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Total Revenue from {client.name}
                  </span>
                  <strong style={{ fontSize: '20px', color: 'var(--success)' }}>
                    {formatCurrency(totalRevenue)}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {revenueRecords.map((r, idx) => (
                    <div key={r.id} style={{
                      background: 'var(--bg-main)', borderRadius: '12px',
                      padding: '14px 16px', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="tag">{r.work_type}</span>
                          {r.employee_name && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>👤 {r.employee_name}</span>
                          )}
                        </div>
                        {r.notes && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.notes}</p>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                      <strong style={{ fontSize: '18px', color: 'var(--success)', flexShrink: 0 }}>
                        {formatCurrency(r.value)}
                      </strong>
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
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ClientDetailDrawer;
