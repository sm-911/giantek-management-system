import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import EmployeeModal from '../components/EmployeeModal';
import EmployeeDetailDrawer from '../components/EmployeeDetailDrawer';
import Modal from '../components/Modal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency, getErrorMessage } from '../utils/helpers';
import {
  MdAdd, MdEdit, MdSearch, MdKey, MdPersonOff, MdPersonAdd,
  MdDelete, MdHistory, MdExpandMore, MdExpandLess, MdRestoreFromTrash,
  MdWork, MdAttachMoney, MdAccessTime, MdCheckCircle, MdOpenInNew
} from 'react-icons/md';

// ─── History Modal ──────────────────────────────────────────────────────────
const HistoryModal = ({ employee, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/employees/${employee.id}/history`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load history.'))
      .finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <Modal title={`Work History — ${employee.name}`} onClose={onClose} size="lg">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <div className="spinner" />
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stats row */}
          <div className="history-stats">
            <div className="history-stat">
              <MdWork size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div className="history-stat__val">{data.stats.total_tasks ?? 0}</div>
                <div className="history-stat__lbl">Total Tasks</div>
              </div>
            </div>
            <div className="history-stat">
              <MdCheckCircle size={18} style={{ color: 'var(--success)' }} />
              <div>
                <div className="history-stat__val">{data.stats.completed_tasks ?? 0}</div>
                <div className="history-stat__lbl">Completed</div>
              </div>
            </div>
            <div className="history-stat">
              <MdAccessTime size={18} style={{ color: 'var(--warning)' }} />
              <div>
                <div className="history-stat__val">{data.stats.total_hours ?? 0} hrs</div>
                <div className="history-stat__lbl">Hours Logged</div>
              </div>
            </div>
            <div className="history-stat">
              <MdAttachMoney size={18} style={{ color: 'var(--success)' }} />
              <div>
                <div className="history-stat__val">{formatCurrency(data.stats.total_revenue ?? 0)}</div>
                <div className="history-stat__lbl">Revenue Generated</div>
              </div>
            </div>
          </div>

          {/* Work Entries */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>
              📋 Work Entries ({data.work_entries.length})
            </h4>
            {data.work_entries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No work entries found.</p>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Work Type</th>
                      <th>Status</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.work_entries.map(w => (
                      <tr key={w.id}>
                        <td>{formatDate(w.work_date)}</td>
                        <td className="table__primary">{w.client_name}</td>
                        <td>
                          <span className="tag">{w.work_type}</span>
                          {w.misc_description && <span className="table__sub"> {w.misc_description}</span>}
                        </td>
                        <td>
                          <span style={{
                            color: w.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                            fontWeight: 600, fontSize: '12px'
                          }}>
                            {w.status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
                          </span>
                        </td>
                        <td>{w.time_taken} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>
              💰 Revenue Records ({data.revenue.length})
            </h4>
            {data.revenue.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No revenue records found.</p>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Work Type</th>
                      <th>Value</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue.map(r => (
                      <tr key={r.id}>
                        <td className="table__primary">{r.client_name}</td>
                        <td><span className="tag">{r.work_type}</span></td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(r.value)}</td>
                        <td className="text-muted">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Failed to load history.</p>
      )}
    </Modal>
  );
};

// ─── Main Employees Page ───────────────────────────────────────────────────────
const Employees = () => {
  const [employees, setEmployees] = useState([]);          // active (not deleted)
  const [removedEmployees, setRemovedEmployees] = useState([]); // deleted ones
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // for detail drawer
  const [resetTargetId, setResetTargetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/employees?include_removed=true');
      const active  = data.filter(e => !e.is_deleted);
      const removed = data.filter(e => e.is_deleted);
      setEmployees(active);
      setRemovedEmployees(removed);
      setFiltered(active);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const { data } = await api.get('/auth/reset-requests');
      setResetRequests(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchEmployees();
    fetchResetRequests();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.mobile && e.mobile.includes(q))
    ));
  }, [search, employees]);

  // ── Deactivate / Reactivate (is_active toggle) ───────────────────────────
  const handleToggleActive = async (emp) => {
    const action = emp.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${emp.is_active ? 'Deactivate' : 'Reactivate'} ${emp.name}?`)) return;
    try {
      await api.put(`/employees/${emp.id}`, {
        name: emp.name,
        mobile: emp.mobile || '',
        is_active: emp.is_active ? 0 : 1
      });
      toast.success(`${emp.name} ${emp.is_active ? 'deactivated' : 'reactivated'}.`);
      fetchEmployees();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Remove employee (is_deleted = 1, data preserved) ─────────────────────
  const handleRemove = async (emp) => {
    const confirmed = window.confirm(
      `Remove "${emp.name}" from the employee list?\n\n` +
      `✅ All their work entries, revenue, and history will be PRESERVED and can be reviewed anytime.\n` +
      `❌ They will no longer be able to log in.\n\n` +
      `This action can be undone by restoring the employee.`
    );
    if (!confirmed) return;
    try {
      await api.delete(`/employees/${emp.id}`);
      toast.success(`${emp.name} removed. Their data is preserved.`);
      fetchEmployees();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Restore removed employee ──────────────────────────────────────────────
  const handleRestore = async (emp) => {
    if (!window.confirm(`Restore ${emp.name}? Their account will be reactivated.`)) return;
    try {
      await api.post(`/employees/${emp.id}/restore`);
      toast.success(`${emp.name} restored successfully!`);
      fetchEmployees();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Admin password reset ───────────────────────────────────────────────────
  const handleAdminReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.'); return;
    }
    try {
      await api.post(`/employees/${resetTargetId}/reset-password`, { new_password: newPassword });
      toast.success('Password reset successfully.');
      setResetTargetId(null);
      setNewPassword('');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Employees</h1>
            <p className="page__subtitle">
              {employees.length} active employee{employees.length !== 1 ? 's' : ''}
              {removedEmployees.length > 0 && ` · ${removedEmployees.length} removed`}
            </p>
          </div>
          <button className="btn btn--primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <MdAdd size={18} /> Add Employee
          </button>
        </div>

        {/* Reset Token Requests Banner */}
        {resetRequests.length > 0 && (
          <div className="alert alert--warning">
            <strong>⚠️ Pending Password Reset Requests ({resetRequests.length})</strong>
            {resetRequests.map(r => (
              <div key={r.id} className="reset-request">
                <span><strong>{r.user_name}</strong> ({r.user_email})</span>
                <span>Token: <code className="token-code">{r.token}</code></span>
                <span className="text-muted">Expires: {formatDate(r.expires_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <MdSearch size={18} className="search-bar__icon" />
          <input className="search-bar__input" placeholder="Search by name, email or mobile..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* ── Active Employees Table ────────────────────────────────────── */}
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="table__empty"><div className="spinner" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="table__empty">
                    {search ? 'No employees match your search.' : 'No employees yet. Add your first employee!'}
                  </td></tr>
                ) : filtered.map((emp, idx) => (
                  <tr key={emp.id}
                    className={!emp.is_active ? 'table__row--inactive' : ''}
                    onClick={() => setSelectedEmployee(emp)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view employee details"
                  >
                    <td className="text-muted">{idx + 1}</td>
                    <td className="table__primary">{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.mobile || '—'}</td>
                    <td>
                      <span className={`status-badge ${emp.is_active ? 'status-badge--active' : 'status-badge--inactive'}`}>
                        {emp.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>{formatDate(emp.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        {/* Open detail drawer */}
                        <button className="icon-btn" title="View details"
                          onClick={() => setSelectedEmployee(emp)}
                          style={{ color: 'var(--accent)' }}>
                          <MdOpenInNew size={16} />
                        </button>
                        {/* Edit */}
                        <button className="icon-btn" title="Edit employee"
                          onClick={() => { setEditTarget(emp); setShowModal(true); }}>
                          <MdEdit size={16} />
                        </button>
                        {/* View history */}
                        <button className="icon-btn" title="View work history"
                          onClick={() => setHistoryTarget(emp)}
                          style={{ color: 'var(--secondary)' }}>
                          <MdHistory size={16} />
                        </button>
                        {/* Reset password */}
                        <button className="icon-btn" title="Reset password"
                          onClick={() => setResetTargetId(emp.id)}>
                          <MdKey size={16} />
                        </button>
                        {/* Toggle active/suspended */}
                        <button
                          className={`icon-btn ${emp.is_active ? '' : 'icon-btn--success'}`}
                          title={emp.is_active ? 'Suspend account' : 'Reactivate account'}
                          onClick={() => handleToggleActive(emp)}
                          style={{ color: emp.is_active ? 'var(--warning)' : 'var(--success)' }}>
                          {emp.is_active ? <MdPersonOff size={16} /> : <MdPersonAdd size={16} />}
                        </button>
                        {/* Remove (preserve data) */}
                        <button className="icon-btn icon-btn--danger" title="Remove employee (data preserved)"
                          onClick={() => handleRemove(emp)}>
                          <MdDelete size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Removed Employees Section ─────────────────────────────────── */}
        {removedEmployees.length > 0 && (
          <div className="card">
            {/* Collapsible header */}
            <button
              className="removed-section-toggle"
              onClick={() => setShowRemoved(v => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MdDelete size={18} style={{ color: 'var(--danger)' }} />
                <span>Removed Employees</span>
                <span className="removed-count">{removedEmployees.length}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  — Data preserved · Click to {showRemoved ? 'hide' : 'view'}
                </span>
              </div>
              {showRemoved ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </button>

            {showRemoved && (
              <div>
                {/* Info banner */}
                <div style={{
                  padding: '12px 20px',
                  background: 'rgba(99, 102, 241, 0.06)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12.5px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ℹ️ These employees have been removed from the active list. All their work entries and revenue records are preserved. You can view their history or restore them at any time.
                </div>

                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Removed On</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {removedEmployees.map(emp => (
                        <tr key={emp.id} style={{ opacity: 0.75 }}>
                          <td>
                            <span className="table__primary">{emp.name}</span>
                            <span className="removed-tag">Removed</span>
                          </td>
                          <td>{emp.email}</td>
                          <td>{emp.mobile || '—'}</td>
                          <td>{formatDate(emp.updated_at)}</td>
                          <td>
                            <div className="action-btns">
                              {/* View history */}
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => setHistoryTarget(emp)}
                                style={{ gap: '5px' }}
                              >
                                <MdHistory size={14} /> View History
                              </button>
                              {/* Restore */}
                              <button
                                className="btn btn--sm"
                                style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', gap: '5px' }}
                                onClick={() => handleRestore(emp)}
                              >
                                <MdRestoreFromTrash size={14} /> Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Employee Detail Drawer ──────────────────────────────────────── */}
      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* ── Add/Edit Employee Modal ─────────────────────────────────────── */}
      {showModal && (
        <EmployeeModal
          employee={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={fetchEmployees}
        />
      )}

      {/* ── Work History Modal ──────────────────────────────────────────── */}
      {historyTarget && (
        <HistoryModal
          employee={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* ── Admin Password Reset Modal ──────────────────────────────────── */}
      {resetTargetId && (
        <div className="modal-overlay" onClick={() => setResetTargetId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Reset Employee Password</h2>
              <button className="modal__close" onClick={() => setResetTargetId(null)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="form__group">
                <label className="form__label">New Password</label>
                <input className="form__input" type="password" minLength={6}
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters" autoFocus />
                <span className="form__hint">Employee will be prompted to change this on next login.</span>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setResetTargetId(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleAdminReset}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Employees;
