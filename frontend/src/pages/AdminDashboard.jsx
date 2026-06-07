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
  MdWork, MdPeople, MdBusiness, MdAttachMoney,
  MdCheckCircle, MdPending, MdToday, MdAccessTime
} from 'react-icons/md';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [empStats, setEmpStats] = useState([]);
  const [workTypeStats, setWorkTypeStats] = useState([]);
  const [dailyWork, setDailyWork] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const priorityData = [
    { name: 'Low', value: recentWork.filter(w => w.priority === 'Low').length },
    { name: 'Medium', value: recentWork.filter(w => w.priority === 'Medium').length },
    { name: 'High', value: recentWork.filter(w => w.priority === 'High').length },
    { name: 'Urgent', value: recentWork.filter(w => w.priority === 'Urgent').length },
  ].filter(d => d.value > 0);

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
            icon={<MdAttachMoney size={24} />} color="#10b981" subtext="All time" />
          <StatCard label="Total Hours Logged" value={`${summary?.totalHours ?? 0} hrs`}
            icon={<MdAccessTime size={24} />} color="#f59e0b" />
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
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="in_progress" name="In Progress" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Work Type Breakdown */}
          <div className="chart-card">
            <h3 className="chart-card__title">Work Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={workTypeStats} dataKey="total" nameKey="work_type"
                  cx="50%" cy="50%" outerRadius={80} label={({ work_type, percent }) => `${work_type} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--text-secondary)' }}>
                  {workTypeStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
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
    </Layout>
  );
};

export default AdminDashboard;
