import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import WorkModal from '../components/WorkModal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
  formatDate, formatDateTime, getPriorityColor,
  getStatusColor, getStatusLabel, WORK_TYPES, PRIORITIES, getErrorMessage
} from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { MdAdd, MdEdit, MdDelete, MdLockOpen, MdSearch, MdFilterList, MdClear } from 'react-icons/md';

const WorkEntries = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '', status: initialStatus, work_type: '', priority: '',
    employee_id: '', client_id: '', date_from: '', date_to: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v && k !== 'search') params.append(k, v); });
      if (filters.search) params.append('search', filters.search);
      const { data } = await api.get(`/work?${params}`);
      setEntries(data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    if (isAdmin) api.get('/employees').then(r => setEmployees(r.data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => { fetchEntries(); }, [filters]);

  const handleFilterChange = (e) => setFilters(p => ({ ...p, [e.target.name]: e.target.value }));
  const clearFilters = () => setFilters({ search: '', status: '', work_type: '', priority: '', employee_id: '', client_id: '', date_from: '', date_to: '' });

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this work entry for "${entry.client_name}"?`)) return;
    try {
      await api.delete(`/work/${entry.id}`);
      toast.success('Work entry deleted.');
      fetchEntries();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleUnlock = async (entry) => {
    try {
      await api.post(`/work/${entry.id}/unlock`);
      toast.success('Work entry unlocked for editing.');
      fetchEntries();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const canEdit = (entry) => {
    if (isAdmin) return true;
    if (entry.is_locked) return false;
    return entry.employees?.some(e => e.id === user.id);
  };

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Work Entries</h1>
            <p className="page__subtitle">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'} found</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--ghost" onClick={() => setShowFilters(v => !v)}>
              <MdFilterList size={18} /> Filters
            </button>
            <button className="btn btn--primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
              <MdAdd size={18} /> Add Work
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <MdSearch size={18} className="search-bar__icon" />
          <input className="search-bar__input" name="search" placeholder="Search by client name or description..."
            value={filters.search} onChange={handleFilterChange} />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-panel__grid">
              <div className="form__group">
                <label className="form__label">Status</label>
                <select className="form__input form__input--sm" name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form__group">
                <label className="form__label">Work Type</label>
                <select className="form__input form__input--sm" name="work_type" value={filters.work_type} onChange={handleFilterChange}>
                  <option value="">All</option>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form__group">
                <label className="form__label">Priority</label>
                <select className="form__input form__input--sm" name="priority" value={filters.priority} onChange={handleFilterChange}>
                  <option value="">All</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {isAdmin && (
                <div className="form__group">
                  <label className="form__label">Employee</label>
                  <select className="form__input form__input--sm" name="employee_id" value={filters.employee_id} onChange={handleFilterChange}>
                    <option value="">All</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form__group">
                <label className="form__label">Client</label>
                <select className="form__input form__input--sm" name="client_id" value={filters.client_id} onChange={handleFilterChange}>
                  <option value="">All</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form__group">
                <label className="form__label">Date From</label>
                <input className="form__input form__input--sm" type="date" name="date_from"
                  value={filters.date_from} onChange={handleFilterChange} />
              </div>

              <div className="form__group">
                <label className="form__label">Date To</label>
                <input className="form__input form__input--sm" type="date" name="date_to"
                  value={filters.date_to} onChange={handleFilterChange} />
              </div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
              <MdClear size={14} /> Clear Filters
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Work Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Hours</th>
                  {isAdmin && <th>Assigned To</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="table__empty"><div className="spinner" /></td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="table__empty">No work entries match your filters.</td></tr>
                ) : entries.map((entry, idx) => (
                  <tr key={entry.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>{formatDate(entry.work_date)}</td>
                    <td className="table__primary">{entry.client_name}</td>
                    <td>
                      <span className="tag">{entry.work_type}</span>
                      {entry.misc_description && (
                        <span className="table__sub"> {entry.misc_description}</span>
                      )}
                    </td>
                    <td>
                      <span className="status-badge"
                        style={{ color: getStatusColor(entry.status), background: `${getStatusColor(entry.status)}22` }}>
                        {getStatusLabel(entry.status)}
                      </span>
                      {!!entry.is_locked && !isAdmin && (
                        <span className="lock-icon" title="Locked for editing">🔒</span>
                      )}
                    </td>
                    <td style={{ color: getPriorityColor(entry.priority), fontWeight: 600 }}>
                      {entry.priority}
                    </td>
                    <td>{entry.time_taken} hrs</td>
                    {isAdmin && <td>{entry.employees?.map(e => e.name).join(', ') || '—'}</td>}
                    <td>
                      <div className="action-btns">
                        {canEdit(entry) && (
                          <button className="icon-btn" title="Edit"
                            onClick={() => { setEditTarget(entry); setShowModal(true); }}>
                            <MdEdit size={16} />
                          </button>
                        )}
                        {isAdmin && !!entry.is_locked && (
                          <button className="icon-btn" title="Unlock for employee editing"
                            onClick={() => handleUnlock(entry)}>
                            <MdLockOpen size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button className="icon-btn icon-btn--danger" title="Delete"
                            onClick={() => handleDelete(entry)}>
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <WorkModal
          entry={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={fetchEntries}
        />
      )}
    </Layout>
  );
};

export default WorkEntries;
