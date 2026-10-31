# 🏛️ CivicTrack API Documentation & Postman Collection

[![Postman Collection](https://img.shields.io/badge/Postman-Collection%20v2.1-orange?logo=postman)](https://raw.githubusercontent.com/dsathwik13-spec/CivicTrack/main/docs/CivicTrack_Postman_Collection.json)
[![API Version](https://img.shields.io/badge/API-v1.0.0-blue)](https://github.com/dsathwik13-spec/CivicTrack)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/dsathwik13-spec/CivicTrack/blob/main/LICENSE)
[![Branch: main](https://img.shields.io/badge/Branch-main-purple.svg)](https://github.com/dsathwik13-spec/CivicTrack/tree/main)

Official REST API documentation and Postman Collection for the **CivicTrack Public Grievance Redressal & SLA Tracking System**.

---

## ⚡ Quick GitHub Links

| Resource | Direct Link |
|---|---|
| **Postman Collection (GitHub Blob)** | [CivicTrack_Postman_Collection.json](https://github.com/dsathwik13-spec/CivicTrack/blob/main/docs/CivicTrack_Postman_Collection.json) |
| **Postman 1-Click Import Link (Raw JSON)** | [`https://raw.githubusercontent.com/dsathwik13-spec/CivicTrack/main/docs/CivicTrack_Postman_Collection.json`](https://raw.githubusercontent.com/dsathwik13-spec/CivicTrack/main/docs/CivicTrack_Postman_Collection.json) |
| **Database ER Diagram (PNG)** | [CivicTrack_Database_ER_Diagram.png](https://github.com/dsathwik13-spec/CivicTrack/blob/main/docs/CivicTrack_Database_ER_Diagram.png) |
| **Database ER Diagram (Mermaid)** | [CivicTrack_Database_ER_Diagram.mmd](https://github.com/dsathwik13-spec/CivicTrack/blob/main/docs/CivicTrack_Database_ER_Diagram.mmd) |
| **API Documentation Markdown** | [API_DOCUMENTATION.md](https://github.com/dsathwik13-spec/CivicTrack/blob/main/docs/API_DOCUMENTATION.md) |
| **GitHub Repository** | [https://github.com/dsathwik13-spec/CivicTrack](https://github.com/dsathwik13-spec/CivicTrack) |

---

## 🚀 How to Import into Postman

### Method 1: Import via Direct GitHub URL (Fastest)
1. Open **Postman**.
2. Click the **Import** button in the top-left corner.
3. Paste the raw GitHub URL into the input field:
   ```text
   https://raw.githubusercontent.com/dsathwik13-spec/CivicTrack/main/docs/CivicTrack_Postman_Collection.json
   ```
4. Click **Import**. The **CivicTrack API** collection will immediately appear in your Collections sidebar.

### Method 2: Import via Local File
1. Clone the repository or download `docs/CivicTrack_Postman_Collection.json`.
2. In Postman, click **Import** ➔ **File** and drag-and-drop the JSON file.

---

## 🔐 Authentication & Session Management

CivicTrack uses an enterprise-grade, secure HTTP-only cookie session architecture (`civictrack.sid`).

### Key Properties
- **Cookie Name**: `civictrack.sid`
- **Security Flags**: `HttpOnly`, `SameSite=Lax`, `Secure` (in production behind HTTPS reverse proxies).
- **Session Store**: PostgreSQL (`connect-pg-simple`) on Supabase in production, memory/SQLite in local tests.
- **CORS Handling**: `credentials: true` with strict origin allowlist.
- **Session Duration**: 24 hours.

### Postman Cookie Jar
Postman automatically stores the `civictrack.sid` session cookie returned by the `POST /api/auth/login` or `POST /api/auth/register` endpoints and transmits it on all subsequent requests to the same host. No manual token copying is necessary!

### Pre-Seeded Accounts for Testing

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Citizen** | `citizen1@civictrack.demo` | `Citizen@CivicTrack2024` | File complaints, view personal complaints, public tracking, request reopen |
| **Field Officer** | `officer.roads@civictrack.demo` | `Officer@CivicTrack2024` | View assigned department complaints, update status, add updates & internal notes |
| **Department Manager** | `roads.manager@civictrack.demo` | `Manager@CivicTrack2024` | Department queue, assign complaints to officers, escalate priority, view analytics |
| **System Admin** | `admin@civictrack.demo` | `Admin@CivicTrack2024` | Full city access, user role management, deactivation, department creation, audit logs |

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Public / Unauth | Citizen | Officer | Manager | Admin |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `/api/auth/register` | `POST` | ✅ | ✅ | — | — | — |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/logout` | `POST` | — | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | — | ✅ | ✅ | ✅ | ✅ |
| `/api/complaints/public` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/complaints/track/:ref` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/complaints` | `POST` | — | ✅ | ✅ | ✅ | ✅ |
| `/api/complaints/my` | `GET` | — | ✅ (own only) | — | — | — |
| `/api/complaints` | `GET` | — | ❌ | ✅ (dept/assigned) | ✅ (dept) | ✅ (all) |
| `/api/complaints/:id` | `GET` | — | ✅ (own only) | ✅ | ✅ | ✅ |
| `/api/complaints/:id/status` | `PUT` | — | ✅ (reopen only) | ✅ | ✅ | ✅ |
| `/api/complaints/:id/assign` | `PUT` | — | ❌ | ❌ | ✅ (own dept) | ✅ (all) |
| `/api/complaints/:id/priority` | `PUT` | — | ❌ | ✅ | ✅ | ✅ |
| `/api/complaints/:id/updates` | `POST` | — | ❌ | ✅ | ✅ | ✅ |
| `/api/complaints/:id/notes` | `POST` | — | ❌ | ✅ | ✅ | ✅ |
| `/api/dashboard/stats` | `GET` | ✅ (city aggregate) | ✅ | ✅ | ✅ | ✅ |
| `/api/dashboard/analytics` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/dashboard/escalations` | `GET` | — | ❌ | ✅ | ✅ | ✅ |
| `/api/admin/users` | `GET` | — | ❌ | ❌ | ❌ | ✅ |
| `/api/admin/users/:id/role` | `PUT` | — | ❌ | ❌ | ❌ | ✅ |
| `/api/admin/users/:id/status` | `PUT` | — | ❌ | ❌ | ❌ | ✅ |
| `/api/admin/departments` | `GET` | — | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/departments` | `POST` | — | ❌ | ❌ | ❌ | ✅ |
| `/api/admin/departments/:id/officers` | `GET` | — | ❌ | ✅ | ✅ | ✅ |
| `/api/admin/audit-logs` | `GET` | — | ❌ | ❌ | ❌ | ✅ |
| `/api/notifications` | `GET` | — | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |
| `/api/jobs/escalation` | `GET` | Bearer `CRON_SECRET` | — | — | — | — |

---

## 📜 Statutory Right to Service (RTS) SLA Charter

| Civic Category (`category`) | Statutory SLA (`target_hours`) | Escalation Threshold (`escalation_hours`) |
|---|:---:|:---:|
| `water_supply` | **24 Hours** | 12 Hours |
| `roads_potholes` | **48 Hours** | 24 Hours |
| `sanitation_waste` | **24 Hours** | 12 Hours |
| `streetlights` | **48 Hours** | 24 Hours |
| `drainage` | **48 Hours** | 24 Hours |
| `public_infrastructure` | **72 Hours** | 48 Hours |
| `other` | **72 Hours** | 48 Hours |

---

## 📖 Complete API Endpoint Reference

### 1. Authentication

#### `POST /api/auth/register`
Creates a new Citizen account and auto-initiates session.

- **Request Body**:
  ```json
  {
    "first_name": "Aarav",
    "last_name": "Sharma",
    "email": "aarav.sharma@example.com",
    "password": "Password@123",
    "phone": "+91 98765 43210"
  }
  ```
- **Validation**:
  - `email`: Valid email format (lowercased and trimmed).
  - `password`: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number.
  - `first_name`, `last_name`: Required, max 100 characters.
  - `phone`: Optional, max 20 characters.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 5,
        "email": "aarav.sharma@example.com",
        "first_name": "Aarav",
        "last_name": "Sharma",
        "phone": "+91 98765 43210",
        "role": "citizen",
        "department_id": null,
        "is_active": true,
        "created_at": "2026-10-31 10:00:00"
      }
    },
    "message": "Account created successfully"
  }
  ```

#### `POST /api/auth/login`
Authenticates existing user and issues `civictrack.sid` session cookie.

- **Request Body**:
  ```json
  {
    "email": "citizen1@civictrack.demo",
    "password": "Citizen@CivicTrack2024"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 4,
        "email": "citizen1@civictrack.demo",
        "first_name": "Priya",
        "last_name": "Rao",
        "phone": "+91 98765 43210",
        "role": "citizen",
        "department_id": null,
        "is_active": true,
        "created_at": "2026-10-01 08:00:00"
      }
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{"success": false, "error": "Invalid email or password"}`
  - `403 Forbidden`: `{"success": false, "error": "Account has been deactivated"}`

#### `GET /api/auth/me`
Fetches the authenticated user profile.
- **Headers**: Requires active session cookie.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 4,
        "email": "citizen1@civictrack.demo",
        "first_name": "Priya",
        "last_name": "Rao",
        "phone": "+91 98765 43210",
        "role": "citizen",
        "department_id": null,
        "department_name": null,
        "is_active": true,
        "created_at": "2026-10-01 08:00:00"
      }
    }
  }
  ```

#### `POST /api/auth/logout`
Destroys current session and clears `civictrack.sid` cookie.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### 2. Citizen Grievance Redressal

#### `POST /api/complaints`
Registers a new grievance with automatic high-entropy ID generation (`CT-XXXXX`) and SLA target resolution calculation.

- **Auth**: Requires Citizen, Officer, Manager, or Admin role.
- **Request Body**:
  ```json
  {
    "title": "Severe deep potholes near 5th Cross Road",
    "description": "Multiple craters spanning 4 feet across causing major traffic slowdown and extreme 2-wheeler danger after recent rains.",
    "category": "roads_potholes",
    "location": "14th Main, 5th Cross, Sector 2, HSR Layout",
    "city": "Bengaluru",
    "incident_date": "2026-10-31"
  }
  ```
- **Validation**:
  - `category`: Must be one of `roads_potholes`, `water_supply`, `sanitation_waste`, `streetlights`, `drainage`, `public_infrastructure`, `other`.
  - `title`: Min 5 chars, max 200 chars.
  - `description`: Min 20 chars, max 5000 chars.
  - `location`: Min 3 chars, max 500 chars.
  - `city`: Min 2 chars, max 100 chars.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "complaint": {
        "id": 14,
        "grievance_id": "CT-K7Y9M2X4W1",
        "title": "Severe deep potholes near 5th Cross Road",
        "description": "Multiple craters spanning 4 feet across...",
        "category": "roads_potholes",
        "priority": "medium",
        "status": "submitted",
        "citizen_id": 4,
        "location": "14th Main, 5th Cross, Sector 2, HSR Layout",
        "city": "Bengaluru",
        "incident_date": "2026-10-31",
        "target_resolution_date": "2026-11-02 10:00:00",
        "is_overdue": 0,
        "created_at": "2026-10-31 10:00:00",
        "updated_at": "2026-10-31 10:00:00"
      }
    },
    "message": "Complaint registered successfully"
  }
  ```

#### `GET /api/complaints/my`
Retrieves grievances filed by the logged-in citizen with strict user isolation.

- **Query Parameters**:
  - `page`: Default `1`
  - `pageSize`: Default `20` (Max `100`)
  - `search`: Keyword search across title, description, reference ID, and location.
  - `category`: Filter by category
  - `status`: Filter by comma-separated statuses (e.g. `submitted,in_progress`)
  - `sort`: Sort column (`created_at`, `updated_at`, `priority`, `status`)
  - `order`: `asc` or `desc` (default `desc`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [ ... ],
      "total": 3,
      "page": 1,
      "pageSize": 20,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/complaints/public`
Public anonymized grievance listing for civic transparency.
- **Query Parameters**: Same filters as `/my`.
- **PII Protection**: Strips citizen names, phone numbers, email addresses, and internal notes.

#### `GET /api/complaints/track/:grievanceId`
Public tracking timeline for any citizen using their reference number (e.g. `CT-QSJMFJTAH7`).
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "complaint": {
        "grievance_id": "CT-QSJMFJTAH7",
        "title": "Flooded Underpass during Heavy Rainfall",
        "category": "drainage",
        "status": "in_progress",
        "priority": "high",
        "location": "Marathahalli Underpass",
        "city": "Bengaluru",
        "target_resolution_date": "2026-11-01 14:00:00",
        "is_overdue": 0,
        "department_name": "Drainage & Stormwater"
      },
      "history": [
        {
          "previous_status": null,
          "new_status": "submitted",
          "reason": "Complaint registered",
          "created_at": "2026-10-30 14:00:00",
          "changed_by": "Priya Rao"
        },
        {
          "previous_status": "submitted",
          "new_status": "acknowledged",
          "reason": "Stormwater team alerted",
          "created_at": "2026-10-30 14:30:00",
          "changed_by": "Ramesh Kumar"
        }
      ],
      "updates": [
        {
          "message": "High-power de-watering pumps deployed at underpass.",
          "author": "Ramesh Kumar",
          "created_at": "2026-10-30 15:00:00"
        }
      ]
    }
  }
  ```

#### `GET /api/complaints/:id`
Full complaint details including internal notes (internal notes are only visible to staff).

---

### 3. Field Operations & Department Management

#### `GET /api/complaints`
Filtered grievance queue for municipal staff. Automatically scopes queries based on the actor's role:
- **Officers**: Assigned complaints or department-wide complaints.
- **Managers**: All department complaints.
- **Admins**: Citywide complaints.

#### `PUT /api/complaints/:id/status`
Executes an audited status transition.

- **Valid Status Transitions**:
  - `submitted` ➔ `acknowledged`, `assigned`
  - `acknowledged` ➔ `assigned`, `in_progress`
  - `assigned` ➔ `in_progress`, `acknowledged`
  - `in_progress` ➔ `awaiting_information`, `resolved`
  - `awaiting_information` ➔ `in_progress`, `resolved`
  - `resolved` ➔ `closed`, `reopened`
  - `closed` ➔ `reopened`
  - `reopened` ➔ `acknowledged`, `assigned`, `in_progress`
- **Request Body (Resolving)**:
  ```json
  {
    "status": "resolved",
    "reason": "Repair work verified by site supervisor.",
    "resolution_notes": "Bituminous mix laid and compacted across 15 sq meters."
  }
  ```

#### `PUT /api/complaints/:id/assign`
Assigns complaint to a specific department and field officer.
- **Auth**: Requires `manager` or `admin` role. Managers can only assign within their assigned department.
- **Request Body**:
  ```json
  {
    "department_id": 1,
    "officer_id": 2,
    "reason": "Assigned to Ward 150 Senior Road Engineer"
  }
  ```

#### `PUT /api/complaints/:id/priority`
Updates urgency level (`low`, `medium`, `high`, `critical`) and automatically recalculates statutory resolution target date.
- **Auth**: Requires `officer`, `manager`, or `admin`.

#### `POST /api/complaints/:id/updates`
Posts a public progress update that is visible to the citizen and listed on the public tracking portal.
- **Request Body**:
  ```json
  {
    "message": "Paving team en route with bitumen roller."
  }
  ```

#### `POST /api/complaints/:id/notes`
Posts a confidential internal note.
- **Auth**: Requires `officer`, `manager`, or `admin`.
- **Request Body**:
  ```json
  {
    "note": "Awaiting clearance from water board regarding underground pipeline."
  }
  ```

#### `GET /api/dashboard/escalations`
Lists all overdue complaints and recent escalation history.
- **Auth**: Requires `officer`, `manager`, or `admin`.

---

### 4. System Administration

#### `GET /api/admin/users`
Lists all users with pagination, search, and role filter (`citizen`, `officer`, `manager`, `admin`).
- **Auth**: Requires `admin` role.

#### `PUT /api/admin/users/:id/role`
Updates a user's role and assigned department.
- **Auth**: Requires `admin` role (prevents self-demotion).
- **Request Body**:
  ```json
  {
    "role": "officer",
    "department_id": 1
  }
  ```

#### `PUT /api/admin/users/:id/status`
Toggles active status between `1` (Active) and `0` (Deactivated). Prevents self-deactivation.
- **Auth**: Requires `admin` role.

#### `GET /api/admin/departments`
Lists all municipal departments, including head officer names, active staff counts, and open complaint counts.
- **Auth**: Requires authenticated user.

#### `POST /api/admin/departments`
Creates a new municipal department.
- **Auth**: Requires `admin` role.
- **Request Body**:
  ```json
  {
    "name": "Urban Forestry & Horticulture",
    "description": "Tree maintenance, park cleanliness, and vegetation management."
  }
  ```

#### `GET /api/admin/audit-logs`
Returns the immutable system audit trail.
- **Auth**: Requires `admin` role.

---

### 5. Dashboard & Analytics

#### `GET /api/dashboard/stats`
Aggregated grievance indicators for executive overviews.
- **Query Parameter**: `scope=department` (filters stats to requesting user's department).
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "total": 13,
      "submitted": 1,
      "acknowledged": 2,
      "assigned": 3,
      "inProgress": 4,
      "awaitingInfo": 0,
      "resolved": 2,
      "closed": 1,
      "reopened": 0,
      "overdue": 1,
      "avgResolutionHours": 18.5,
      "resolutionRate": 23
    }
  }
  ```

#### `GET /api/dashboard/analytics`
Returns full visual dataset for Recharts:
- `byCategory`: Complaint count per category.
- `byStatus`: Distribution across 8 statuses.
- `byPriority`: Distribution across 4 urgency levels.
- `byDepartment`: Department workload breakdown (total, open, resolved, overdue).
- `overTime`: 30-day timeline of registrations.
- `resolutionByCategory`: Turnaround times per category.
- `slaCompliance`: Total within SLA vs breached.

---

### 6. Notifications

#### `GET /api/notifications`
Retrieves paginated notifications for the logged-in user with unread counter.

#### `PUT /api/notifications/:id/read`
Marks single notification as read.

#### `PUT /api/notifications/read-all`
Marks all notifications for current user as read.

---

### 7. System Health & Cron Escalation

#### `GET /api/health`
Checks API and database operational status.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "CivicTrack API is running",
    "engine": "postgresql",
    "timestamp": "2026-10-31T09:00:00.000Z"
  }
  ```

#### `GET /api/jobs/escalation`
Statutory SLA breach auditing job. Evaluates target resolution deadlines, sets `is_overdue = 1`, and creates escalation events.
- **Header**: Requires `Authorization: Bearer <CRON_SECRET>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Escalation check completed",
    "timestamp": "2026-10-31T09:00:00.000Z"
  }
  ```

---

## 💻 Postman Collection Structure

```text
CivicTrack API
├── 01. Authentication
│   ├── Register Citizen Account
│   ├── Login — Citizen
│   ├── Login — Field Officer
│   ├── Login — Department Manager
│   ├── Login — System Administrator
│   ├── Get Current User Profile (/me)
│   └── Logout
├── 02. Citizen Grievances
│   ├── Create Grievance
│   ├── Get My Grievances (Authenticated Citizen)
│   ├── Public Grievances Feed
│   ├── Track Grievance by Reference ID (Public)
│   ├── Get Grievance Full Details
│   └── Citizen Request Reopen
├── 03. Field Operations & Department Management
│   ├── List Filtered Grievances (Staff Queue)
│   ├── Update Status — Acknowledged
│   ├── Update Status — In Progress
│   ├── Update Status — Resolved (With Resolution Notes)
│   ├── Assign Officer / Department (Manager / Admin)
│   ├── Update Priority & Recalculate SLA
│   ├── Post Public Field Update
│   ├── Add Internal Staff Note
│   ├── Get Department Officers
│   └── Get Escalations & Overdue Queue
├── 04. System Administration
│   ├── List Users (Admin)
│   ├── Update User Role & Department
│   ├── Toggle User Active Status
│   ├── List Departments
│   ├── Create Department
│   └── View System Audit Logs
├── 05. Dashboard & Analytics
│   ├── Grievance Aggregated Statistics
│   └── Citywide Analytics & Breakdown
├── 06. Notifications
│   ├── Get User Notifications
│   ├── Mark Notification as Read
│   └── Mark All Notifications as Read
└── 07. System & Cron Jobs
    ├── API Health Check
    └── Run SLA Escalation Check (Cron / Admin)
```

---

## 🛠️ Postman Collection Variables

Configure these variables in your Postman Environment or Collection Settings:

| Variable | Default Value | Description |
|---|---|---|
| `baseUrl` | `http://localhost:3001` | Base URL of CivicTrack server (or your Vercel deployment URL) |
| `grievanceId` | `CT-QSJMFJTAH7` | Sample Reference ID for public tracking tests |
| `complaintId` | `1` | Sample Complaint database ID |
| `departmentId` | `1` | Sample Department ID |
| `notificationId` | `1` | Sample Notification ID |
| `userId` | `2` | Sample User ID for admin management |
| `cronSecret` | `your-cron-secret-here` | Secret token matching `CRON_SECRET` in `server/.env` |

---

*CivicTrack API Documentation — Maintained on branch `main` at [https://github.com/dsathwik13-spec/CivicTrack](https://github.com/dsathwik13-spec/CivicTrack)*
