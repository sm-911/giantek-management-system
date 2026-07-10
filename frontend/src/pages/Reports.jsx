import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { formatCurrency } from '../utils/helpers';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

const Reports = () => {
  const [empStats, setEmpStats] = useState([]);
  const [clientStats, setClientStats] = useState([]);
  const [workTypeStats, setWorkTypeStats] = useState([]);
  const [dailyWork, setDailyWork] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [priorityStats, setPriorityStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [e, c, wt, d, rt, p] = await Promise.all([
          api.get('/reports/employee-stats'),
          api.get('/reports/client-stats'),
          api.get('/reports/work-type-stats'),
          api.get('/reports/daily-work'),
          api.get('/reports/revenue-trend'),
          api.get('/reports/priority-stats')
        ]);
        setEmpStats(e.data);
        setClientStats(c.data.slice(0, 10));
        setWorkTypeStats(wt.data);
        setDailyWork(d.data);
        setRevenueTrend(rt.data);
        setPriorityStats(p.data);
      } catch { /* handle silently */ }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <Layout>
      <div className="page-loading"><div className="spinner" /><p>Loading reports...</p></div>
    </Layout>
  );

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Reports & Analytics</h1>
            <p className="page__subtitle">Comprehensive insights across all operations</p>
          </div>
        </div>

        {/* ── Work Trend ─────────────────────────────────────────────────── */}
        <div className="chart-card chart-card--full">
          <h3 className="chart-card__title">📈 Work Entries — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={280}>
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
              <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hours" name="Hours" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="charts-grid">
          {/* Revenue Trend */}
          <div className="chart-card">
            <h3 className="chart-card__title">💰 Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={v => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }} />
                <Bar dataKey="total_revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="total_revenue" position="insideTop" fill="#fff" formatter={v => v > 0 ? (v/1000).toFixed(1) + 'K' : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Work Type Pie */}
          <div className="chart-card">
            <h3 className="chart-card__title">🗂️ Work Type Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={workTypeStats} dataKey="total" nameKey="work_type"
                  cx="50%" cy="50%" outerRadius={90}>
                  {workTypeStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Breakdown */}
          <div className="chart-card">
            <h3 className="chart-card__title">🚦 Priority Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="priority" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={60} />
                <Tooltip cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }} />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="completed" position="insideRight" fill="#fff" formatter={v => v > 0 ? v : ''} />
                </Bar>
                <Bar dataKey="total" name="Total" fill="#6366f180" stackId="b" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="total" position="insideRight" fill="#fff" formatter={v => v > 0 ? v : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Employee Performance Table ─────────────────────────────────── */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">👥 Employee Performance</h3>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Completion Rate</th>
                  <th>Total Hours</th>
                  <th>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {empStats.map(e => {
                  const rate = e.total_tasks > 0 ? ((e.completed_tasks / e.total_tasks) * 100).toFixed(0) : 0;
                  return (
                    <tr key={e.id}>
                      <td className="table__primary">{e.name}</td>
                      <td>{e.total_tasks}</td>
                      <td style={{ color: 'var(--success)' }}>{e.completed_tasks}</td>
                      <td style={{ color: 'var(--warning)' }}>{e.pending_tasks}</td>
                      <td>
                        <div className="progress-bar">
                          <div className="progress-bar__fill" style={{ width: `${rate}%` }} />
                          <span>{rate}%</span>
                        </div>
                      </td>
                      <td>{e.total_hours} hrs</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(e.total_revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Top Clients Table ──────────────────────────────────────────── */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">🏢 Top Clients by Work Volume</h3>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Total Hours</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clientStats.map(c => (
                  <tr key={c.id}>
                    <td className="table__primary">{c.name}</td>
                    <td>{c.company_name || '—'}</td>
                    <td>{c.total_tasks}</td>
                    <td style={{ color: 'var(--success)' }}>{c.completed_tasks}</td>
                    <td style={{ color: 'var(--warning)' }}>{c.pending_tasks}</td>
                    <td>{c.total_hours} hrs</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(c.total_revenue)}</td>
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

export default Reports;
