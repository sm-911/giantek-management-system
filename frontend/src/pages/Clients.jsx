import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ClientModal from '../components/ClientModal';
import ClientDetailDrawer from '../components/ClientDetailDrawer';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { formatDate, getErrorMessage } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdBusiness, MdOpenInNew } from 'react-icons/md';

const Clients = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null); // for drawer

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/clients');
      setClients(data);
      setFiltered(data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ));
  }, [search, clients]);

  const handleDelete = async (e, client) => {
    e.stopPropagation(); // prevent opening drawer
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      toast.success(`Client "${client.name}" deleted.`);
      if (selectedClient?.id === client.id) setSelectedClient(null);
      fetchClients();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleEdit = (e, client) => {
    e.stopPropagation(); // prevent opening drawer
    setEditTarget(client);
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="page">
        <div className="page__header">
          <div>
            <h1 className="page__title">Clients</h1>
            <p className="page__subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''} registered</p>
          </div>
          {isAdmin && (
            <button className="btn btn--primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
              <MdAdd size={18} /> Add Client
            </button>
          )}
        </div>

        {/* Search */}
        <div className="search-bar">
          <MdSearch size={18} className="search-bar__icon" />
          <input className="search-bar__input" placeholder="Search by name, company, or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Client cards grid */}
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <MdBusiness size={48} />
            <p>No clients found. {isAdmin && 'Add your first client to get started.'}</p>
            {isAdmin && (
              <button className="btn btn--primary" onClick={() => setShowModal(true)}>
                <MdAdd size={16} /> Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="client-grid">
            {filtered.map(client => (
              <div
                key={client.id}
                className="client-card client-card--clickable"
                onClick={() => setSelectedClient(client)}
                title="Click to view work entries & revenue"
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                {/* "View Details" hint */}
                <div style={{
                  position: 'absolute', top: '10px', right: isAdmin ? '70px' : '12px',
                  fontSize: '11px', color: 'var(--accent)', opacity: 0.7,
                  display: 'flex', alignItems: 'center', gap: '3px'
                }}>
                  <MdOpenInNew size={12} /> View
                </div>

                <div className="client-card__header">
                  <div className="client-card__avatar">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="client-card__info">
                    <h4 className="client-card__name">{client.name}</h4>
                    {client.company_name && (
                      <p className="client-card__company">{client.company_name}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="action-btns" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" title="Edit" onClick={e => handleEdit(e, client)}>
                        <MdEdit size={15} />
                      </button>
                      <button className="icon-btn icon-btn--danger" title="Delete" onClick={e => handleDelete(e, client)}>
                        <MdDelete size={15} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="client-card__meta">
                  {client.contact_number && <span>📞 {client.contact_number}</span>}
                  {client.email && <span>✉️ {client.email}</span>}
                  <span className="text-muted">Added {formatDate(client.created_at)}</span>
                </div>
                {client.notes && <p className="client-card__notes">{client.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client detail drawer */}
      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {showModal && (
        <ClientModal
          client={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={fetchClients}
        />
      )}
    </Layout>
  );
};

export default Clients;
