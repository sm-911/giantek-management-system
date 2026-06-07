import { useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/helpers';

const ClientModal = ({ client, onClose, onSaved }) => {
  const isEdit = !!client;
  const [form, setForm] = useState({
    name: client?.name || '',
    contact_number: client?.contact_number || '',
    email: client?.email || '',
    company_name: client?.company_name || '',
    notes: client?.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Client name is required.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/clients/${client.id}`, form);
        toast.success('Client updated!');
      } else {
        await api.post('/clients', form);
        toast.success('Client created!');
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
    <Modal title={isEdit ? 'Edit Client' : 'Add Client'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form__group">
          <label className="form__label">Client / Organisation Name *</label>
          <input className="form__input" name="name" required maxLength={255}
            value={form.name} onChange={handleChange}
            placeholder="e.g. ABC Ltd or Ramesh Iyer" />
        </div>

        <div className="form__row">
          <div className="form__group">
            <label className="form__label">Contact Number</label>
            <input className="form__input" name="contact_number"
              value={form.contact_number} onChange={handleChange} placeholder="Phone number" />
          </div>
          <div className="form__group">
            <label className="form__label">Email</label>
            <input className="form__input" name="email" type="email"
              value={form.email} onChange={handleChange} placeholder="client@email.com" />
          </div>
        </div>

        <div className="form__group">
          <label className="form__label">Company Name</label>
          <input className="form__input" name="company_name"
            value={form.company_name} onChange={handleChange}
            placeholder="If different from client name" />
        </div>

        <div className="form__group">
          <label className="form__label">Notes</label>
          <textarea className="form__input form__textarea" name="notes" rows={3}
            value={form.notes} onChange={handleChange}
            placeholder="Any additional notes about this client..." />
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;
