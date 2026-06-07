# Giantek Management System

A full-stack **Employee & Client Management Portal** for **Giantek Consultancy Services**, built with Node.js/Express backend and React/Vite frontend.

## Features

- 🔐 JWT-based authentication with role-based access (Admin / Employee)
- 👥 Employee management (CRUD, suspend/restore, password reset)
- 🏢 Client management
- 📋 Work entry tracking with lock/unlock workflow
- 💰 Revenue recording and reporting (admin only)
- 📊 Dashboard with charts (work trends, revenue, employee performance)
- 📁 Audit log for all admin actions
- 🔔 In-app notifications

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts, React Icons |
| Backend | Node.js, Express, better-sqlite3 |
| Database | SQLite |
| Auth | JWT + bcrypt |
| Styling | Vanilla CSS |

## Getting Started

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Default Admin Login
```
Email:    admin@giantek.com
Password: Admin@123
```

## Project Structure

```
giantek-portal/
├── backend/
│   ├── db/           # SQLite database setup & seeding
│   ├── middleware/   # Auth, role guards
│   ├── routes/       # API routes (auth, employees, clients, work, revenue, reports, audit)
│   └── server.js
└── frontend/
    └── src/
        ├── pages/    # Login, AdminDashboard, Employees, Clients, WorkEntries, Revenue, Reports, AuditLog
        ├── components/
        ├── context/  # AuthContext
        └── api/      # Axios instance
```
