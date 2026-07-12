# TransitOps — Authentication & RBAC

## Overview

TransitOps uses **JWT Bearer token authentication** with **Role-Based Access Control (RBAC)**. All protected API routes require a valid token and enforce permissions on the backend.

## Authentication Flow

```
Client                          Server
  |                               |
  |  POST /api/v1/auth/login      |
  |  { email, password }          |
  |------------------------------>|
  |                               | Validate credentials (bcrypt)
  |                               | Generate JWT
  |  { token, user, permissions } |
  |<------------------------------|
  |                               |
  |  GET /api/v1/vehicles         |
  |  Authorization: Bearer <token>|
  |------------------------------>|
  |                               | Verify JWT
  |                               | Check RBAC permission
  |  { data }                     |
  |<------------------------------|
```

## API Endpoints

### Login (Public)

```
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "fleet@transitops.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h",
    "user": {
      "id": "uuid",
      "name": "Fleet Manager",
      "email": "fleet@transitops.com",
      "roleId": "uuid",
      "roleName": "Fleet Manager",
      "role": {
        "id": "uuid",
        "name": "Fleet Manager"
      },
      "permissions": ["dashboard:read", "vehicles:*", "maintenance:*", "reports:read", "analytics:read"]
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

### Get Profile (Protected)

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Get Accessible Modules (Protected)

```
GET /api/v1/auth/modules
Authorization: Bearer <token>
```

Returns the navigation modules available to the authenticated user's role.

### Get Permission Matrix (Protected)

```
GET /api/v1/auth/permissions
Authorization: Bearer <token>
```

Returns the full RBAC permission matrix for all roles (used by Settings page).

## Demo Accounts

| Role               | Email                      | Password     |
|--------------------|----------------------------|--------------|
| Fleet Manager      | fleet@transitops.com       | password123  |
| Dispatcher         | dispatcher@transitops.com  | password123  |
| Safety Officer     | safety@transitops.com      | password123  |
| Financial Analyst  | finance@transitops.com     | password123  |

## RBAC Permission Matrix

| Module        | Fleet Manager | Dispatcher | Safety Officer | Financial Analyst |
|---------------|:-------------:|:----------:|:--------------:|:-----------------:|
| Dashboard     | Read          | Read       | Read           | Read              |
| Vehicles      | Full          | —          | —              | —                 |
| Maintenance   | Full          | —          | —              | —                 |
| Trips         | —             | Full       | —              | —                 |
| Drivers       | —             | —          | Full           | —                 |
| Compliance    | —             | —          | Read           | —                 |
| Fuel Logs     | —             | —          | —              | Full              |
| Expenses      | —             | —          | —              | Full              |
| Reports       | Read          | —          | Read           | Read              |
| Analytics     | Read          | —          | —              | Read              |

**Full** = create, read, update, delete (+ module-specific actions like dispatch, suspend, close)

## Permission Format

Permissions use the format `resource:action`:

```
vehicles:read
vehicles:create
vehicles:update
vehicles:delete
vehicles:*          ← wildcard grants all actions on resource
```

## Middleware Usage

Future route modules will use these middleware functions:

```typescript
import { authenticate } from '../middleware/auth.middleware';
import { authorize, authorizeResource } from '../middleware/rbac.middleware';
import { RESOURCES, ACTIONS } from '../constants/permissions';

// Require authentication
router.get('/vehicles', authenticate, controller.getAll);

// Require specific permission
router.post('/vehicles', authenticate, authorize('vehicles:create'), controller.create);

// Require resource + action
router.post(
  '/trips/:id/dispatch',
  authenticate,
  authorizeResource(RESOURCES.TRIPS, ACTIONS.DISPATCH),
  controller.dispatch,
);
```

## HTTP Status Codes

| Code | Meaning                                      |
|------|----------------------------------------------|
| 401  | Missing, invalid, or expired token           |
| 403  | Authenticated but insufficient permissions   |

## Environment Variables

| Variable         | Description                    | Default |
|------------------|--------------------------------|---------|
| `JWT_SECRET`     | Secret key for signing tokens  | —       |
| `JWT_EXPIRES_IN` | Token expiration duration      | `24h`   |
