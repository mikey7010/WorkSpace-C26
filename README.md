# WorkSpace — Team Task Management Platform

Full-stack production workspace task application for 1 Admin + 10 Team Members.

## Architecture
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, @hello-pangea/dnd (Kanban)
- **Backend**: Node.js, Express, Prisma ORM, JSON Web Tokens (JWT), bcrypt, Zod validation, express-rate-limit
- **Database**: PostgreSQL (Prisma Client)
- **Container**: Docker Compose included for instant local PostgreSQL setup

---

## Quick Start Guide

### 1. Start the PostgreSQL Database

#### Option A: Using Docker (Recommended if Docker Desktop is installed)
Start Docker Desktop on your machine, then run in the root directory:
```bash
docker compose up -d
```
*(Uses `postgres:16-alpine` on port 5432 with database `workspacedb`)*

#### Option B: Using Cloud PostgreSQL (Neon / Supabase / Railway)
1. Create a free PostgreSQL project at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy your connection string into `server/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   ```

#### Option C: Existing Local PostgreSQL
Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE workspacedb;
```

---

### 2. Run Database Migrations & Seed Sample Data

In the `server` directory:
```bash
cd server
npx prisma db push
npm run db:seed
```

This seeds:
- **Admin**: `admin@workspace.app` / `admin123`
- **10 Team Members**: `bob@workspace.app` to `kate@workspace.app` / `member123`
- **15 Initial Tasks** with diverse statuses (To Do, In Progress, Review, Done), priorities, and deadlines

---

### 3. Launch Development Servers

**Backend (API Server on port 4000):**
```bash
cd server
npm run dev
```

**Frontend (Vite Server on port 5173):**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Role Features

### Admin Experience
- **Admin Dashboard**: Summary metrics (Total, Completed, In Progress, Overdue), stacked bar chart of tasks per member, status split donut chart, member workload progress bars, live activity feed.
- **Task Board**: Full Kanban board with drag-and-drop across To Do → In Progress → Review → Done.
- **Task Management**: Create and assign tasks with priority and due date, click tasks to inspect comments and edit.
- **Team Management**: Real-time list of members with completion rate, overdue alerts, and add/remove member capabilities.
- **Reports & Analytics**: Weekly completion line chart, member performance breakdown, and one-click CSV export.

### Member Experience
- **My Tasks**: Kanban board filtered strictly to the logged-in member's tasks with instant status advancement (`→`) and comment threads.
- **My Stats**: Personal completion percentage, status breakdown chart, and personal task list.
- **Role Security**: Server-enforced middleware ensures members can only update status on tasks assigned to them.
