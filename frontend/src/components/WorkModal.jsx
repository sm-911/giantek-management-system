import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
  WORK_TYPES, PRIORITIES, STATUSES, TIME_OPTIONS,
  todayISO, getErrorMessage
} from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const WorkModal = ({ entry, onClose, onSaved, prefillClientId }) => {
  const isEdit = !!entry;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    client_id: entry?.client_id || prefillClientId || '',
    status: entry?.status || 'in_progress',
    work_type: entry?.work_type || '',
    misc_description: entry?.misc_description || '',
    time_taken: entry?.time_taken || 1,
    priority: entry?.priority || 'Medium',
    work_date: entry?.work_date || todayISO(),
    employee_ids: entry?.employees?.map(e => e.id) || [user?.id]
  });
  const [loading, setLoading] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/employees').then(r => setEmployees(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const toggleEmployee = (empId) => {
    setForm(p => ({
      ...p,
      employee_ids: p.employee_ids.includes(empId)
        ? p.employee_ids.filter(id => id !== empId)
        : [...p.employee_ids, empId]
    }));
  };

  const handleAddNewClient = async () => {
    if (!newClientName.trim()) { toast.error('Client name is required.'); return; }
    setAddingClient(true);
    try {
      const { data } = await api.post('/clients', { name: newClientName.trim() });
      setClients(prev => [...prev, data]);
      setForm(p => ({ ...p, client_id: data.id }));
      setShowNewClient(false);
      setNewClientName('');
      toast.success(`Client "${data.name}" created!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAddingClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id) { toast.error('Please select a client.'); return; }
    if (!form.work_type) { toast.error('Please select a work type.'); return; }
    if (form.work_type === 'Miscellaneous' && !form.misc_description.trim()) {
      toast.error('Please describe the miscellaneous work.'); return;
    }
    if (!form.time_taken) { toast.error('Please select time taken.'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        misc_description: form.work_type === 'Miscellaneous' ? form.misc_description : undefined,
        employee_ids: isAdmin ? form.employee_ids : [user.id]
      };

      if (isEdit) {
        await api.put(`/work/${entry.id}`, payload);
        toast.success('Work entry updated!');
      } else {
        await api.post('/work', payload);
        toast.success('Work entry created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Work Entry' : 'Add Work Entry'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="form">
        {/* Client selection */}
        <div className="form__group">
          <label className="form__label">Client *</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="form__input" name="client_id" value={form.client_id}
              onChange={handleChange} required style={{ flex: 1 }}>
              <option value="">Select client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost btn--sm"
              onClick={() => setShowNewClient(v => !v)}>
              + New Client
            </button>
          </div>

          {showNewClient && (
            <div className="inline-add" style={{ marginTop: '8px' }}>
              <input className="form__input" value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                placeholder="New client name" style={{ flex: 1 }} />
              <button type="button" className="btn btn--primary btn--sm"
                onClick={handleAddNewClient} disabled={addingClient}>
                {addingClient ? '...' : 'Add'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm"
                onClick={() => setShowNewClient(false)}>Cancel</button>
            </div>
          )}
        </div>

        <div className="form__row">
          {/* Work Type */}
          <div className="form__group">
            <label className="form__label">Type of Work *</label>
            <select className="form__input" name="work_type" value={form.work_type}
              onChange={handleChange} required>
              <option value="">Select type...</option>
              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div className="form__group">
            <label className="form__label">Priority *</label>
            <select className="form__input" name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Miscellaneous description */}
        {form.work_type === 'Miscellaneous' && (
          <div className="form__group">
            <label className="form__label">Describe Work * <span className="form__hint">(max 100 chars)</span></label>
            <input className="form__input" name="misc_description" maxLength={100}
              value={form.misc_description} onChange={handleChange}
              placeholder="Briefly describe the work..." required />
            <span className="form__hint char-count">{form.misc_description.length}/100</span>
          </div>
        )}

        <div className="form__row">
          {/* Status */}
          <div className="form__group">
            <label className="form__label">Status *</label>
            <select className="form__input" name="status" value={form.status} onChange={handleChange}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Time Taken */}
          <div className="form__group">
            <label className="form__label">Time Taken *</label>
            <select className="form__input" name="time_taken" value={form.time_taken} onChange={handleChange}>
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t} hr{t !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Work Date */}
          <div className="form__group">
            <label className="form__label">Work Date *</label>
            <input className="form__input" type="date" name="work_date"
              value={form.work_date} onChange={handleChange} required />
          </div>
        </div>

        {/* Assigned Employees (admin only) */}
        {isAdmin && employees.length > 0 && (
          <div className="form__group">
            <label className="form__label">Assigned Employees</label>
            <div className="emp-checklist">
              {employees.map(emp => (
                <label key={emp.id} className={`emp-chip ${form.employee_ids.includes(emp.id) ? 'emp-chip--selected' : ''}`}>
                  <input type="checkbox"
                    checked={form.employee_ids.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    style={{ display: 'none' }} />
                  {emp.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Entry' : 'Create Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkModal;
