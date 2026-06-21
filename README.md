# Giantek Management System

A full-stack **Employee & Client Management Portal** for **Giantek Consultancy Services**, built with a Node.js/Express backend and a React/Vite frontend.

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

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | React 18, Vite, Recharts, React Icons |
| Backend  | Node.js, Express                      |
| Database | MySQL (hosted on Render / Aiven / etc.) |
| Auth     | JWT + bcrypt                          |
| Styling  | Vanilla CSS                           |

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js >= 18
- A running MySQL server (local or cloud)

### 2. Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# Required
MYSQL_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_super_secret_key_here

# Optional — defaults to http://localhost:5173 if not set
FRONTEND_URL=http://localhost:5173
```

> 💡 **Tip:** For local development you can use `MYSQL_URL=mysql://root:password@localhost:3306/giantek`

### 3. Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```
The database tables and the default admin account are **automatically created** on first startup.

### 4. Frontend
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

---

## Deploying to Render.com

### Step 1 — Create a MySQL Database
1. Go to [Render.com](https://render.com) → **New +** → **MySQL** (or use a free external provider like [Aiven.io](https://aiven.io)).
2. Copy the **External Connection URL** (it looks like `mysql://user:pass@host:port/dbname`).

### Step 2 — Deploy the Backend (Web Service)
1. **New +** → **Web Service** → connect your GitHub repository.
2. Set the following:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
3. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `MYSQL_URL` | *(paste your MySQL connection URL from Step 1)* |
   | `JWT_SECRET` | *(any strong random string)* |
   | `FRONTEND_URL` | *(your Render frontend URL — add after Step 3)* |
4. Click **Deploy**.

### Step 3 — Deploy the Frontend (Static Site)
1. **New +** → **Static Site** → connect the same GitHub repository.
2. Set the following:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | *(your Render backend URL from Step 2, e.g. `https://giantek-api.onrender.com`)* |
4. Click **Deploy**.

### Step 4 — Update CORS
Go back to your backend Web Service → **Environment** tab and set:
- `FRONTEND_URL` → your Render static site URL (e.g. `https://giantek.onrender.com`)

Then redeploy the backend service.

---

## Project Structure

```
giantek-portal/
├── backend/
│   ├── db/           # MySQL connection pool, schema creation & seeding
│   ├── middleware/   # Auth guard, role checks, audit logger
│   ├── routes/       # API routes (auth, employees, clients, work, revenue, reports, audit, notifications)
│   └── server.js
└── frontend/
    └── src/
        ├── pages/        # Login, AdminDashboard, Employees, Clients, WorkEntries, Revenue, Reports, AuditLog
        ├── components/
        ├── context/      # AuthContext
        └── services/     # Axios instance (api.js)
```
