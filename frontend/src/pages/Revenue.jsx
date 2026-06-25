import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import RevenueModal from '../components/RevenueModal';
import StatCard from '../components/StatCard';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency, getErrorMessage, WORK_TYPES } from '../utils/helpers';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCurrencyRupee, MdFilterList } from 'react-icons/md';

// Generate last 24 months as options
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

const Revenue = () => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    employee_id: '',
    client_id: '',
    work_type: '',
    month: ''   // format: 'YYYY-MM'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.work_type) params.append('work_type', filters.work_type);

      const [rev, emp, cli] = await Promise.all([
        api.get(`/revenue?${params}`),
        api.get('/employees'),
        api.get('/clients')
      ]);
      setRecords(rev.data);
      setEmployees(emp.data);
      setClients(cli.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters.employee_id, filters.client_id, filters.work_type]);

  // Apply search + month filter client-side
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return records.filter(r => {
      const matchSearch = !q ||
        r.employee_name?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.work_type?.toLowerCase().includes(q);

      const matchMonth = !filters.month ||
        (r.created_at && r.created_at.startsWith(filters.month));

      return matchSearch && matchMonth;
    });
  }, [records, filters.search, filters.month]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this revenue record?')) return;
    try {
      await api.delete(`/revenue/${id}`);
      toast.success('Revenue record deleted.');
      fetchData();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const totalRevenue = filtered.reduce((sum, r) => sum + r.value, 0);

  // Revenue by employee (for display)
  const empRevenue = employees.map(emp => ({
    name: emp.name,
    total: filtered.filter(r => r.employee_id === emp.id).reduce((s, r) => s + r.value, 0)
  })).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

  const selectedMonthLabel = filters.month
    ? MONTH_OPTIONS.find(m => m.value === filters.month)?.label
    : 'All Time';

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Revenue</h1>
            <p className="page__subtitle">Track and manage value generated — Admin only</p>
          </div>
          <button className="btn btn--primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <MdAdd size={18} /> Add Revenue
          </button>
        </div>

        {/* Summary Cards */}
        <div className="stat-grid stat-grid--3">
          <StatCard
            label={`Total Revenue${filters.month ? ` — ${selectedMonthLabel}` : ''}`}
            value={formatCurrency(totalRevenue)}
            icon={<MdCurrencyRupee size={24} />}
            color="var(--success)"
            subtext={`${filtered.length} entries`}
          />
          {empRevenue.slice(0, 2).map(e => (
            <StatCard key={e.name} label={e.name} value={formatCurrency(e.total)}
              icon={<MdCurrencyRupee size={24} />} color="var(--primary)" subtext="Revenue generated" />
          ))}
        </div>

        {/* Filters */}
        <div className="filter-row">
          {/* Search */}
          <div className="search-bar" style={{ flex: 1 }}>
            <MdSearch size={18} className="search-bar__icon" />
            <input className="search-bar__input" placeholder="Search employee, client..."
              value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
          </div>

          {/* Month filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MdFilterList size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <select className="form__input form__input--sm" style={{ width: '190px' }}
              value={filters.month} onChange={e => setFilters(p => ({ ...p, month: e.target.value }))}>
              <option value="">All Months</option>
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Employee filter */}
          <select className="form__input form__input--sm" style={{ width: '175px' }}
            value={filters.employee_id} onChange={e => setFilters(p => ({ ...p, employee_id: e.target.value }))}>
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          {/* Client filter */}
          <select className="form__input form__input--sm" style={{ width: '175px' }}
            value={filters.client_id} onChange={e => setFilters(p => ({ ...p, client_id: e.target.value }))}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Work type filter */}
          <select className="form__input form__input--sm" style={{ width: '160px' }}
            value={filters.work_type} onChange={e => setFilters(p => ({ ...p, work_type: e.target.value }))}>
            <option value="">All Work Types</option>
            {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Client</th>
                  <th>Work Type</th>
                  <th>Value</th>
                  <th>Notes</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="table__empty"><div className="spinner" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="table__empty">No revenue records found.</td></tr>
                ) : filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="table__primary">{r.employee_name}</td>
                    <td>{r.client_name}</td>
                    <td><span className="tag">{r.work_type}</span></td>
                    <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(r.value)}</strong></td>
                    <td className="text-muted">{r.notes || '—'}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn" title="Edit" onClick={() => { setEditTarget(r); setShowModal(true); }}>
                          <MdEdit size={16} />
                        </button>
                        <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => handleDelete(r.id)}>
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Total:</td>
                    <td><strong style={{ color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</strong></td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <RevenueModal
          record={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
        />
      )}
    </Layout>
  );
};

export default Revenue;
