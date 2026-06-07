import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import WorkModal from '../components/WorkModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDate, getPriorityColor, getStatusColor, getStatusLabel, formatCurrency } from '../utils/helpers';
import { MdWork, MdCheckCircle, MdPending, MdAccessTime, MdAdd } from 'react-icons/md';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [myWork, setMyWork] = useState([]);
  const [showAddWork, setShowAddWork] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWork = async () => {
    try {
      const { data } = await api.get('/work');
      setMyWork(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWork(); }, []);

  const totalTasks = myWork.length;
  const completed = myWork.filter(w => w.status === 'completed').length;
  const pending = myWork.filter(w => w.status === 'in_progress').length;
  const totalHours = myWork.reduce((sum, w) => sum + (w.time_taken || 0), 0);
  const todayWork = myWork.filter(w => w.work_date === new Date().toISOString().split('T')[0]);

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="page__subtitle">Your work summary — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowAddWork(true)}>
            <MdAdd size={18} /> Add Work Entry
          </button>
        </div>

        {/* Stats */}
        <div className="stat-grid stat-grid--4">
          <StatCard label="Total Tasks" value={totalTasks} icon={<MdWork size={24} />} color="var(--primary)" />
          <StatCard label="Completed" value={completed} icon={<MdCheckCircle size={24} />} color="var(--success)" />
          <StatCard label="In Progress" value={pending} icon={<MdPending size={24} />} color="var(--warning)" />
          <StatCard label="Hours Logged" value={`${totalHours} hrs`} icon={<MdAccessTime size={24} />} color="var(--secondary)" />
        </div>

        {/* Today's work */}
        {todayWork.length > 0 && (
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">📅 Today's Work</h3>
            </div>
            <div className="work-cards">
              {todayWork.map(w => (
                <div key={w.id} className="work-card">
                  <div className="work-card__top">
                    <span className="work-card__client">{w.client_name}</span>
                    <span className="tag">{w.work_type}</span>
                  </div>
                  {w.misc_description && <p className="work-card__misc">{w.misc_description}</p>}
                  <div className="work-card__meta">
                    <span style={{ color: getStatusColor(w.status) }}>● {getStatusLabel(w.status)}</span>
                    <span style={{ color: getPriorityColor(w.priority) }}>▲ {w.priority}</span>
                    <span>{w.time_taken} hrs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Work Entries */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">All My Work Entries</h3>
          </div>
          {loading ? (
            <div className="loading-row"><div className="spinner" /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Work Type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {myWork.length === 0 ? (
                    <tr><td colSpan={6} className="table__empty">
                      No work entries yet. <button className="link-btn" onClick={() => setShowAddWork(true)}>Add your first entry →</button>
                    </td></tr>
                  ) : myWork.map(w => (
                    <tr key={w.id}>
                      <td>{formatDate(w.work_date)}</td>
                      <td className="table__primary">{w.client_name}</td>
                      <td>
                        <span className="tag">{w.work_type}</span>
                        {w.misc_description && <span className="table__sub"> — {w.misc_description}</span>}
                      </td>
                      <td>
                        <span className="status-badge"
                          style={{ color: getStatusColor(w.status), background: `${getStatusColor(w.status)}22` }}>
                          {getStatusLabel(w.status)}
                        </span>
                      </td>
                      <td style={{ color: getPriorityColor(w.priority), fontWeight: 600 }}>{w.priority}</td>
                      <td>{w.time_taken} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddWork && (
        <WorkModal onClose={() => setShowAddWork(false)} onSaved={fetchWork} />
      )}
    </Layout>
  );
};

export default EmployeeDashboard;
