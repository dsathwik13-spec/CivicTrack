# 🏛️ CivicTrack — Public Grievance Redressal & SLA Tracking System
> **Hackathon Submission | Project ID: HACK-P243**

CivicTrack is an enterprise-grade, citizen-first municipal grievance redressal and service-level agreement (SLA) tracking platform. Designed for local municipal corporations (e.g. BBMP Bangalore), it bridges the accountability gap between citizens and municipal authorities with automated SLA countdowns, role-based workflows, transparent public tracking, and immutable audit logging.

---

## 🌟 Key Features

### 1. 👥 Citizen Grievance Portal
- **Instant Filing**: File complaints across 7 municipal categories (Roads & Potholes, Water Supply, Sanitation & Waste, Streetlights & Electrical, Drainage & Sewage, Public Infrastructure, Other).
- **Statutory SLA Preview**: Automatic deadline calculation (12h - 72h) shown to the citizen *before* submission.
- **Unique Reference Generation**: Nanoid-based high-entropy tracking numbers (e.g. `CT-XXXXX`).
- **Live Tracking & Audit Trail**: Real-time status changes, timestamps, officer logs, and public field updates.
- **Hackathon Quick-Fill Presets**: 1-click test buttons (`🚧 Pothole Incident`, `💧 Water Pipe Burst`, `💡 Streetlight Blackout`).

### 2. 👮 Field Officer & Department Operations
- **Role-Restricted Queues**: Tailored queues for field engineers and department managers.
- **Audited Status Transitions**: `Submitted` ➔ `Acknowledged` ➔ `In Progress` ➔ `Resolved` ➔ `Closed`.
- **Resolution Proof**: Mandatory resolution statement and work report upon marking an issue resolved.
- **Dual-Channel Updates**:
  - *Public Updates*: Visible to citizen and public on the tracking page.
  - *Internal Notes*: Confidential logs restricted to department engineers and supervisors.
- **Visual SLA Clock**: Color-coded countdown timer with automated overdue alerts.

### 3. 👔 Department Management & Escalation Engine
- Automatic background cron evaluation every 30 minutes for SLA breaches.
- Auto-escalation flag (`is_overdue`) highlighted with critical urgency badge.
- Cross-department staff assignments and re-prioritization.

### 4. 🛡️ System Administration & City Analytics
- **Executive KPI Dashboard**: Total grievances, verified resolution rate (%), average resolution turnaround time (hrs), and active SLA escalations.
- **Recharts Visualizations**:
  - Complaints by Civic Category (Bar Chart).
  - Status Distribution (Donut / Ring Chart).
- **Master Grievance Table**: Search, multi-criteria filters, and **1-Click CSV Export**.
- **Department Administration**: Create and configure municipal departments.
- **User Role Management**: Manage staff permissions (`citizen`, `officer`, `manager`, `admin`) and active statuses.
- **Immutable Audit Trail**: System-wide activity logs capturing actors, entity targets, and timestamps.

### 5. ⚡ Hackathon Quick Persona Switcher
- Floating top banner with a 1-click **Demo Switcher Modal** enabling seamless transitions between:
  1. **Demo Citizen** (`citizen1@civictrack.demo`)
  2. **Field Officer** (`officer.roads@civictrack.demo`)
  3. **Department Manager** (`roads.manager@civictrack.demo`)
  4. **System Administrator** (`admin@civictrack.demo`)

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, React Router v7, Lucide Icons, Recharts, React Hot Toast |
| **Styling** | Custom Handcrafted CSS Design System with Ivory & Deep Forest civic palette, Manrope & Inter typography |
| **Backend API** | Node.js, Express, TypeScript, tsx, Express Session, Helmet, Rate Limiter |
| **Database** | SQLite via pure-JS `sql.js` (WebAssembly-backed, cross-platform, zero native compiler dependencies) |
| **Validation & Auth** | Zod schemas, BCrypt password hashing, session cookies |
| **Background Jobs** | Cron-based escalation and SLA breach auditor |

---

## 🔑 Demo Accounts (Pre-Seeded)

All demo accounts are ready out of the box with sample data and status histories:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Admin** | `admin@civictrack.demo` | `Admin@CivicTrack2024` | Full City Analytics, Users, Depts, Audit Logs, CSV Export |
| **Dept Manager** | `roads.manager@civictrack.demo` | `Manager@CivicTrack2024` | Roads & Infrastructure Supervisor Queue & Reassignment |
| **Field Officer** | `officer.roads@civictrack.demo` | `Officer@CivicTrack2024` | Field Repairs Queue, Status Updates, Resolution Notes |
| **Citizen** | `citizen1@civictrack.demo` | `Citizen@CivicTrack2024` | Registered Grievances, Live Tracking, Profile |

*(You can also use the top-right **"⚡ Quick Demo Switcher"** in the UI to switch between these accounts with 1 click!)*

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Startup

1. **Install Dependencies & Seed Database**:
   ```bash
   # In project root
   npm run setup
   ```
   *This initializes the database schema and seeds demo departments, users, SLA policies, and complaints.*

2. **Run Both Servers Concurrently**:
   ```bash
   npm run dev
   ```
   - Frontend launches on: **`http://localhost:5173`**
   - Backend API launches on: **`http://localhost:3001`**

3. **Or Run Individually**:
   ```bash
   # Terminal 1: Backend
   npm run dev:server

   # Terminal 2: Frontend
   npm run dev:client
   ```

---

## 📜 Statutory Right to Service (RTS) SLA Charter

| Civic Category | Responsible Department | Standard SLA | Escalation Threshold |
|---|---|---|---|
| **Water Supply & Contamination** | Water & Sanitation (BWSSB) | **24 Hours** | 12 Hours |
| **Road Potholes & Cave-ins** | Roads & Infrastructure | **48 Hours** | 24 Hours |
| **Sanitation & Waste Dumps** | Waste Management | **24 Hours** | 12 Hours |
| **Streetlights & Electrical Hazards** | Electrical Services | **48 Hours** | 24 Hours |
| **Drainage & Stormwater Overflows** | Drainage & Public Works | **48 Hours** | 24 Hours |
| **Sidewalks & Public Assets** | Public Works | **72 Hours** | 48 Hours |

---

## 🧪 Testing

- **Backend Typecheck**: `cd server && npx tsc --noEmit`
- **Frontend Typecheck**: `cd client && npx tsc -b`
- **Frontend Production Build**: `cd client && npm run build`
- **Database Re-Init / Re-Seed**: `npm run db:reset && npm run db:init && npm run db:seed`
