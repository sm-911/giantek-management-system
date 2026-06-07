import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { formatDateTime } from '../utils/helpers';
import { MdSearch, MdFilterList } from 'react-icons/md';

const ACTION_COLORS = {
  CREATE: '#10b981',
  UPDATE: '#0ea5e9',
  DELETE: '#ef4444',
  LOGIN:  '#6366f1',
  LOGOUT: '#94a3b8',
  UNLOCK: '#f59e0b'
};

const ENTITY_ICONS = {
  user: '👤',
  client: '🏢',
  work_entry: '📋',
  revenue: '💰'
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '', entity_type: '', date_from: '', date_to: '', search: ''
  });
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const { data } = await api.get(`/audit?${params}`);

      // Client-side search filter on description/user_name
      let filtered = data.data;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(l =>
          l.user_name?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.user_email?.toLowerCase().includes(q)
        );
      }
      setLogs(filtered);
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages });
    } catch { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(1); }, [filters]);

  const handleFilterChange = (e) => {
    setFilters(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Audit Log</h1>
            <p className="page__subtitle">Complete history of all system actions — Admin only</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-row" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <MdSearch size={18} className="search-bar__icon" />
            <input className="search-bar__input" name="search" placeholder="Search by user or description..."
              value={filters.search} onChange={handleFilterChange} />
          </div>
          <select className="form__input form__input--sm" name="action" value={filters.action}
            onChange={handleFilterChange} style={{ width: '140px' }}>
            <option value="">All Actions</option>
            {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UNLOCK'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select className="form__input form__input--sm" name="entity_type" value={filters.entity_type}
            onChange={handleFilterChange} style={{ width: '150px' }}>
            <option value="">All Entities</option>
            {['user', 'client', 'work_entry', 'revenue'].map(e => (
              <option key={e} value={e}>{e.replace('_', ' ')}</option>
            ))}
          </select>
          <input className="form__input form__input--sm" type="date" name="date_from"
            value={filters.date_from} onChange={handleFilterChange} style={{ width: '150px' }} />
          <input className="form__input form__input--sm" type="date" name="date_to"
            value={filters.date_to} onChange={handleFilterChange} style={{ width: '150px' }} />
        </div>

        {/* Total count */}
        <p className="page__subtitle" style={{ marginTop: 0 }}>
          Showing {logs.length} of {pagination.total} log entries
        </p>

        {/* Log table */}
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="table__empty"><div className="spinner" /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="table__empty">No audit logs match your filters.</td></tr>
                ) : logs.map(log => (
                  <>
                    <tr key={log.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td>
                        <span className="table__primary">{log.user_name || 'System'}</span>
                        {log.user_email && <span className="table__sub">{log.user_email}</span>}
                      </td>
                      <td>
                        <span className="action-badge"
                          style={{ color: ACTION_COLORS[log.action] || '#94a3b8', background: `${ACTION_COLORS[log.action]}22` }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted">
                          {ENTITY_ICONS[log.entity_type] || '📄'} {log.entity_type?.replace('_', ' ')}
                          {log.entity_id ? ` #${log.entity_id}` : ''}
                        </span>
                      </td>
                      <td>{log.description || '—'}</td>
                      <td>
                        {(log.old_values || log.new_values) && (
                          <button className="link-btn" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                            {expandedId === log.id ? 'Hide' : 'Show'} diff
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded diff row */}
                    {expandedId === log.id && (log.old_values || log.new_values) && (
                      <tr key={`${log.id}-diff`} className="audit-diff-row">
                        <td colSpan={6}>
                          <div className="audit-diff">
                            {log.old_values && (
                              <div className="audit-diff__old">
                                <strong>Before:</strong>
                                <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="audit-diff__new">
                                <strong>After:</strong>
                                <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination__btn ${pagination.page === p ? 'pagination__btn--active' : ''}`}
                  onClick={() => fetchLogs(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AuditLog;
