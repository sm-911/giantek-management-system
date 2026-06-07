import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { WORK_TYPES, formatCurrency, getErrorMessage } from '../utils/helpers';

const RevenueModal = ({ record, onClose, onSaved }) => {
  const isEdit = !!record;
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [workEntries, setWorkEntries] = useState([]);
  const [form, setForm] = useState({
    employee_id: record?.employee_id || '',
    client_id: record?.client_id || '',
    work_entry_id: record?.work_entry_id || '',
    work_type: record?.work_type || '',
    value: record?.value || '',
    notes: record?.notes || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data)).catch(() => {});
    api.get('/clients').then(r => setClients(r.data)).catch(() => {});
  }, []);

  // When client changes, load work entries for that client
  useEffect(() => {
    if (form.client_id) {
      api.get(`/work?client_id=${form.client_id}&status=completed`)
        .then(r => setWorkEntries(r.data))
        .catch(() => {});
    } else {
      setWorkEntries([]);
    }
  }, [form.client_id]);

  // When work entry is selected, auto-fill work type
  useEffect(() => {
    if (form.work_entry_id) {
      const entry = workEntries.find(w => w.id === parseInt(form.work_entry_id));
      if (entry) setForm(p => ({ ...p, work_type: entry.work_type }));
    }
  }, [form.work_entry_id, workEntries]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.client_id || !form.work_type || !form.value) {
      toast.error('Employee, Client, Work Type, and Value are required.');
      return;
    }
    if (parseFloat(form.value) <= 0) {
      toast.error('Value must be greater than 0.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/revenue/${record.id}`, form);
        toast.success('Revenue record updated!');
      } else {
        await api.post('/revenue', form);
        toast.success('Revenue record added!');
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
    <Modal title={isEdit ? 'Edit Revenue Entry' : 'Add Revenue Entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form__row">
          <div className="form__group">
            <label className="form__label">Employee *</label>
            <select className="form__input" name="employee_id" value={form.employee_id}
              onChange={handleChange} required>
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label">Client *</label>
            <select className="form__input" name="client_id" value={form.client_id}
              onChange={handleChange} required>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Optional: link to a completed work entry */}
        {workEntries.length > 0 && (
          <div className="form__group">
            <label className="form__label">Link to Work Entry (Optional)</label>
            <select className="form__input" name="work_entry_id" value={form.work_entry_id}
              onChange={handleChange}>
              <option value="">— Not linked —</option>
              {workEntries.map(w => (
                <option key={w.id} value={w.id}>
                  #{w.id} — {w.work_type}{w.misc_description ? ` (${w.misc_description})` : ''} — {w.work_date}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form__row">
          <div className="form__group">
            <label className="form__label">Type of Work *</label>
            <select className="form__input" name="work_type" value={form.work_type}
              onChange={handleChange} required>
              <option value="">Select type...</option>
              {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form__group">
            <label className="form__label">Value (₹) *</label>
            <input className="form__input" name="value" type="number" min="0" step="0.01"
              value={form.value} onChange={handleChange} required
              placeholder="e.g. 15000" />
          </div>
        </div>

        <div className="form__group">
          <label className="form__label">Notes</label>
          <textarea className="form__input form__textarea" name="notes" rows={2}
            value={form.notes} onChange={handleChange}
            placeholder="Any notes about this revenue entry..." />
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Revenue'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RevenueModal;
