import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/helpers';

const EmployeeModal = ({ employee, onClose, onSaved }) => {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    mobile: employee?.mobile || '',
    password: '',
    is_active: employee?.is_active ?? 1
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.password) {
      toast.error('Password is required for new employees.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/employees/${employee.id}`, {
          name: form.name,
          mobile: form.mobile,
          is_active: form.is_active
        });
        toast.success('Employee updated successfully!');
      } else {
        await api.post('/employees', form);
        toast.success('Employee created successfully!');
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
    <Modal title={isEdit ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form__group">
          <label className="form__label">Full Name *</label>
          <input className="form__input" name="name" required
            value={form.name} onChange={handleChange} placeholder="e.g. Ravi Sharma" />
        </div>

        <div className="form__group">
          <label className="form__label">Email Address *</label>
          <input className="form__input" name="email" type="email" required
            value={form.email} onChange={handleChange}
            placeholder="e.g. ravi@giantek.com"
            disabled={isEdit} /* Email cannot be changed after creation */
          />
          {isEdit && <span className="form__hint">Email cannot be changed after creation.</span>}
        </div>

        <div className="form__group">
          <label className="form__label">Mobile Number</label>
          <input className="form__input" name="mobile"
            value={form.mobile} onChange={handleChange} placeholder="e.g. 9876543210" />
        </div>

        {!isEdit && (
          <div className="form__group">
            <label className="form__label">Initial Password *</label>
            <input className="form__input" name="password" type="password" required minLength={6}
              value={form.password} onChange={handleChange} placeholder="Min. 6 characters" />
            <span className="form__hint">Employee must change this on first login.</span>
          </div>
        )}

        {isEdit && (
          <div className="form__check">
            <input type="checkbox" id="is_active" name="is_active"
              checked={form.is_active === 1}
              onChange={handleChange} />
            <label htmlFor="is_active">Account is Active</label>
          </div>
        )}

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeModal;
