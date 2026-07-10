import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import api from '../api/axios';
import { formatCurrency, formatDate, getPriorityColor, getStatusColor, getStatusLabel } from '../utils/helpers';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  MdWork, MdPeople, MdBusiness, MdCurrencyRupee,
  MdCheckCircle, MdPending, MdToday, MdAccessTime, MdClose
} from 'react-icons/md';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

// ── Hours Logged Modal ────────────────────────────────────────────────────────
const HoursModal = ({ onClose }) => {
  const [period, setPeriod] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHours = async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/hours-by-employee?period=${p}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHours(period); }, [period]);

  const maxHours = data?.employees?.length
    ? Math.max(...data.employees.map(e => Number(e.hours_logged)))
    : 1;

  const PERIOD_TABS = [
    { id: 'daily',   label: 'Today' },
    { id: 'weekly',  label: 'This Week' },
    { id: 'monthly', label: 'This Month' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)', zIndex: 300
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 301,
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', width: 'min(560px, 95vw)', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeInScale .2s ease'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '17px' }}>⏱ Hours Logged Per Employee</h3>
            {data && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{data.periodLabel}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <MdClose size={22} />
          </button>
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
          {PERIOD_TABS.map(t => (
            <button key={t.id} onClick={() => setPeriod(t.id)} style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: 'none', transition: 'all .2s',
              color: period === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: period === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} /> Loading...
            </div>
          ) : !data?.employees?.length ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No entries found for this period.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.employees.map((emp, idx) => (
                <div key={emp.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `${COLORS[idx % COLORS.length]}33`,
                        color: COLORS[idx % COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '13px'
                      }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.entry_count} work {emp.entry_count === 1 ? 'entry' : 'entries'}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: COLORS[idx % COLORS.length], fontSize: '16px' }}>
                      {Number(emp.hours_logged).toFixed(1)} hrs
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, transition: 'width .5s ease',
                      background: COLORS[idx % COLORS.length],
                      width: `${maxHours > 0 ? (Number(emp.hours_logged) / maxHours) * 100 : 0}%`
                    }} />
                  </div>
                </div>
              ))}

              {/* Total bar */}
              <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Total Hours</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {data.employees.reduce((s, e) => s + Number(e.hours_logged), 0).toFixed(1)} hrs
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeInScale { from { opacity:0; transform:translate(-50%,-50%) scale(.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  );
};

// ── Main dashboard component ──────────────────────────────────────────────────
const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [empStats, setEmpStats] = useState([]);
  const [workTypeStats, setWorkTypeStats] = useState([]);
  const [dailyWork, setDailyWork] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHoursModal, setShowHoursModal] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, e, wt, d, rt, rw] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/employee-stats'),
          api.get('/reports/work-type-stats'),
          api.get('/reports/daily-work'),
          api.get('/reports/revenue-trend'),
          api.get('/work?limit=5')
        ]);
        setSummary(s.data);
        setEmpStats(e.data);
        setWorkTypeStats(wt.data);
        setDailyWork(d.data);
        setRevenueTrend(rt.data);
        setRecentWork(rw.data.slice(0, 8));
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <Layout>
      <div className="page-loading"><div className="spinner" /><p>Loading dashboard...</p></div>
    </Layout>
  );

  return (
    <Layout>
      <div className="page">
        {/* Page header */}
        <div className="page__header">
          <div>
            <h1 className="page__title">Admin Dashboard</h1>
            <p className="page__subtitle">Overview of all operations — Giantek Consultancy Services</p>
          </div>
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        <div className="stat-grid">
          <StatCard label="Total Work Entries" value={summary?.totalWork ?? 0}
            icon={<MdWork size={24} />} color="var(--primary)" subtext={`${summary?.todayWork ?? 0} today`} />
          <StatCard label="Completed" value={summary?.completedWork ?? 0}
            icon={<MdCheckCircle size={24} />} color="var(--success)" subtext="All time" />
          <StatCard label="In Progress" value={summary?.inProgressWork ?? 0}
            icon={<MdPending size={24} />} color="var(--warning)" subtext="Pending" />
          <StatCard label="Total Employees" value={summary?.totalEmployees ?? 0}
            icon={<MdPeople size={24} />} color="var(--secondary)" />
          <StatCard label="Total Clients" value={summary?.totalClients ?? 0}
            icon={<MdBusiness size={24} />} color="#8b5cf6" />
          <StatCard label="Total Revenue" value={formatCurrency(summary?.totalRevenue ?? 0)}
            icon={<MdCurrencyRupee size={24} />} color="#10b981" subtext="All time" />
          {/* ── Clickable Hours card ── */}
          <div onClick={() => setShowHoursModal(true)} style={{ cursor: 'pointer' }} title="Click to view hours per employee">
            <StatCard label="Total Hours Logged" value={`${summary?.totalHours ?? 0} hrs`}
              icon={<MdAccessTime size={24} />} color="#f59e0b"
              subtext={<span style={{ color: '#f59e0b', fontSize: '11px' }}>↗ Click to break down by period</span>} />
          </div>
          <StatCard label="Today's Work" value={summary?.todayWork ?? 0}
            icon={<MdToday size={24} />} color="#06b6d4" subtext={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} />
        </div>

        {/* ── Charts Row 1 ───────────────────────────────────────────────── */}
        <div className="charts-grid">
          {/* Daily Work Trend */}
          <div className="chart-card chart-card--lg">
            <h3 className="chart-card__title">Work Entries — Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyWork}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickFormatter={d => {
                    const dt = new Date(d);
                    return isNaN(dt.getTime()) ? String(d).slice(0, 5) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
                  }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  labelFormatter={d => {
                    const dt = new Date(d);
                    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="in_progress" name="In Progress" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Work Type Breakdown — fixed labels using Legend instead of inline */}
          <div className="chart-card">
            <h3 className="chart-card__title">Work Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={workTypeStats}
                  dataKey="total"
                  nameKey="work_type"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  labelLine={false}
                >
                  {workTypeStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(v, name) => [v, name]}
                />
                <Legend
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Charts Row 2 ───────────────────────────────────────────────── */}
        <div className="charts-grid">
          {/* Employee Stats */}
          <div className="chart-card chart-card--lg">
            <h3 className="chart-card__title">Employee Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={empStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="completed_tasks" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending_tasks" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Trend */}
          <div className="chart-card">
            <h3 className="chart-card__title">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={v => [formatCurrency(v), 'Revenue']}
                />
                <Bar dataKey="total_revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Recent Work Entries Table ──────────────────────────────────── */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Recent Work Entries</h3>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Work Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Hours</th>
                  <th>Date</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {recentWork.length === 0 ? (
                  <tr><td colSpan={7} className="table__empty">No work entries yet.</td></tr>
                ) : recentWork.map(w => (
                  <tr key={w.id}>
                    <td className="table__primary">{w.client_name}</td>
                    <td>
                      <span className="tag">{w.work_type}</span>
                      {w.misc_description && <span className="table__sub"> — {w.misc_description}</span>}
                    </td>
                    <td>
                      <span className="status-badge" style={{ color: getStatusColor(w.status), background: `${getStatusColor(w.status)}22` }}>
                        {getStatusLabel(w.status)}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: getPriorityColor(w.priority), fontWeight: 600 }}>{w.priority}</span>
                    </td>
                    <td>{w.time_taken} hrs</td>
                    <td>{formatDate(w.work_date)}</td>
                    <td>{w.employees?.map(e => e.name).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Employee Stats Table ───────────────────────────────────────── */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Employee Summary</h3>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Total Hours</th>
                  <th>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {empStats.length === 0 ? (
                  <tr><td colSpan={6} className="table__empty">No employees yet.</td></tr>
                ) : empStats.map(e => (
                  <tr key={e.id}>
                    <td className="table__primary">{e.name}</td>
                    <td>{e.total_tasks}</td>
                    <td><span style={{ color: 'var(--success)' }}>{e.completed_tasks}</span></td>
                    <td><span style={{ color: 'var(--warning)' }}>{e.pending_tasks}</span></td>
                    <td>{e.total_hours} hrs</td>
                    <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(e.total_revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hours Modal */}
      {showHoursModal && <HoursModal onClose={() => setShowHoursModal(false)} />}
    </Layout>
  );
};

export default AdminDashboard;
