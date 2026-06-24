import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdPeople, MdBusiness, MdWork,
  MdCurrencyRupee, MdBarChart, MdHistory, MdClose
} from 'react-icons/md';

// Navigation links for Admin role
const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard',    icon: MdDashboard },
  { to: '/admin/employees', label: 'Employees',    icon: MdPeople },
  { to: '/admin/clients',   label: 'Clients',      icon: MdBusiness },
  { to: '/admin/work',      label: 'Work Entries', icon: MdWork },
  { to: '/admin/revenue',   label: 'Revenue',      icon: MdCurrencyRupee },
  { to: '/admin/reports',   label: 'Reports',      icon: MdBarChart },
  { to: '/admin/audit',     label: 'Audit Log',    icon: MdHistory },
];

// Navigation links for Employee role
const employeeLinks = [
  { to: '/dashboard',       label: 'Dashboard',    icon: MdDashboard },
  { to: '/clients',         label: 'Clients',      icon: MdBusiness },
  { to: '/work',            label: 'Work Entries', icon: MdWork },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Brand header */}
        <div className="sidebar__brand">
          <img
            src="/logo-icon.png"
            alt="Giantek Logo"
            className="sidebar__logo-img"
          />
          <div className="sidebar__brand-text">
            <span className="sidebar__company">GIANTEK</span>
            <span className="sidebar__tagline">Consultancy Services</span>
          </div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close sidebar">
            <MdClose size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="sidebar__role-badge">
          <span className={`badge badge--${user?.role}`}>
            {user?.role === 'admin' ? '👑 Admin' : '👤 Employee'}
          </span>
        </div>

        {/* Navigation links */}
        <nav className="sidebar__nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <Icon className="sidebar__link-icon" size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <p className="sidebar__version">v1.0.0</p>
          <span className="sidebar__footer-mark">GCS</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
