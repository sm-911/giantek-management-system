import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// ─── Layout ────────────────────────────────────────────────────────────────────
// Wraps all authenticated pages with the sidebar + navbar shell.
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="layout__main">
        <Navbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="layout__content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
