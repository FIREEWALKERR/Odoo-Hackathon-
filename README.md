# Odoo-Hackathon-
# TransitOps — Smart Transport Operations Platform

A centralized platform to manage vehicle registry, driver management, trip
dispatch, maintenance, and fuel/expense tracking with enforced business rules
and operational analytics.

## Tech Stack
- **Frontend:** React (Vite), React Router, Axios, TailwindCSS
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT-based, Role-Based Access Control (RBAC)

## Team & Responsibilities
| Member | Role | Owns |
|---|---|---|
| Vansh | Frontend | Auth UI, Dashboard, Vehicles, Drivers, Maintenance |
| Tirth | Frontend | Trips, Fuel/Expenses, Reports |
| Vraj | Backend | Setup, Auth API, Vehicle/Driver API, Maintenance API, Reports API |
| Raj | Backend | Trip API, Fuel/Expense API, Dashboard API |

## Branch Structure
- `main` — always working, demo-ready code
- `frontend` — all frontend work merges here first
- `backend` — all backend work merges here first
- Periodically, `frontend` and `backend` are merged into `main` once stable

## Getting Started

### Backend
\`\`\`bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
\`\`\`

### Frontend
\`\`\`bash
cd client
npm install
npm run dev
\`\`\`



## Core Business Rules
- Vehicle registration number is unique
- Retired/In Shop vehicles cannot be dispatched
- Drivers with expired licenses or Suspended status cannot be assigned
- Cargo weight must not exceed vehicle max load capacity
- Dispatch sets vehicle + driver to `On Trip`
- Complete/Cancel restores vehicle + driver to `Available`
- Creating a maintenance record sets vehicle to `In Shop`
