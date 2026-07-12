# TransitOps — Database Schema Reference

## Entity Relationship Overview

```
Role ──< User

Vehicle ──< Trip >── Driver
Vehicle ──< MaintenanceLog
Vehicle ──< FuelLog
Vehicle ──< Expense
```

## Tables

### roles
| Column     | Type         | Constraints        |
|------------|--------------|--------------------|
| id         | UUID         | PK                 |
| name       | VARCHAR(50)  | UNIQUE, NOT NULL   |

Seeded values: `Fleet Manager`, `Dispatcher`, `Safety Officer`, `Financial Analyst`

### users
| Column        | Type          | Constraints              |
|---------------|---------------|--------------------------|
| id            | UUID          | PK                       |
| name          | VARCHAR(100)  | NOT NULL                 |
| email         | VARCHAR(255)  | UNIQUE, NOT NULL         |
| password_hash | VARCHAR(255)  | NOT NULL                 |
| role_id       | UUID          | FK → roles.id, RESTRICT  |

### vehicles
| Column                | Type           | Constraints              |
|-----------------------|----------------|--------------------------|
| id                    | UUID           | PK                       |
| registration_number   | VARCHAR(20)    | UNIQUE, NOT NULL         |
| name                  | VARCHAR(100)   | NOT NULL                 |
| type                  | VARCHAR(50)    | NOT NULL, INDEX          |
| maximum_load_capacity | DECIMAL(10,2)  | NOT NULL                 |
| odometer              | DECIMAL(12,2)  | NOT NULL, DEFAULT 0      |
| acquisition_cost      | DECIMAL(12,2)  | NOT NULL                 |
| status                | VehicleStatus  | NOT NULL, INDEX          |
| region                | VARCHAR(100)   | NOT NULL, INDEX          |

**VehicleStatus enum:** `AVAILABLE` | `ON_TRIP` | `IN_SHOP` | `RETIRED`

### drivers
| Column           | Type          | Constraints              |
|------------------|---------------|--------------------------|
| id               | UUID          | PK                       |
| name             | VARCHAR(100)  | NOT NULL, INDEX          |
| license_number   | VARCHAR(30)   | UNIQUE, NOT NULL         |
| license_category | VARCHAR(20)   | NOT NULL                 |
| license_expiry   | DATE          | NOT NULL, INDEX          |
| contact_number   | VARCHAR(20)   | NOT NULL                 |
| safety_score     | DECIMAL(5,2)  | NOT NULL, DEFAULT 100    |
| status           | DriverStatus  | NOT NULL, INDEX          |

**DriverStatus enum:** `AVAILABLE` | `ON_TRIP` | `OFF_DUTY` | `SUSPENDED`

### trips
| Column           | Type          | Constraints                        |
|------------------|---------------|------------------------------------|
| id               | UUID          | PK                                 |
| source           | VARCHAR(200)  | NOT NULL, INDEX                    |
| destination      | VARCHAR(200)  | NOT NULL, INDEX                    |
| vehicle_id       | UUID          | FK → vehicles.id, RESTRICT, INDEX  |
| driver_id        | UUID          | FK → drivers.id, RESTRICT, INDEX   |
| cargo_weight     | DECIMAL(10,2) | NOT NULL                           |
| planned_distance | DECIMAL(10,2) | NOT NULL                           |
| actual_distance  | DECIMAL(10,2) | NULLABLE                           |
| fuel_consumed    | DECIMAL(10,2) | NULLABLE                           |
| revenue          | DECIMAL(12,2) | NULLABLE                           |
| status           | TripStatus    | NOT NULL, INDEX                    |

**TripStatus enum:** `DRAFT` | `DISPATCHED` | `COMPLETED` | `CANCELLED`

### maintenance_logs
| Column           | Type              | Constraints                        |
|------------------|-------------------|------------------------------------|
| id               | UUID              | PK                                 |
| vehicle_id       | UUID              | FK → vehicles.id, RESTRICT, INDEX  |
| maintenance_type | VARCHAR(100)      | NOT NULL, INDEX                    |
| description      | TEXT              | NOT NULL                           |
| cost             | DECIMAL(12,2)     | NOT NULL, DEFAULT 0                |
| status           | MaintenanceStatus | NOT NULL, INDEX                    |
| start_date       | DATE              | NOT NULL, INDEX                    |
| end_date         | DATE              | NULLABLE                           |

**MaintenanceStatus enum:** `OPEN` | `CLOSED`

### fuel_logs
| Column     | Type          | Constraints                        |
|------------|---------------|------------------------------------|
| id         | UUID          | PK                                 |
| vehicle_id | UUID          | FK → vehicles.id, RESTRICT, INDEX  |
| quantity   | DECIMAL(10,2) | NOT NULL                           |
| cost       | DECIMAL(12,2) | NOT NULL                           |
| date       | DATE          | NOT NULL, INDEX                    |

### expenses
| Column     | Type          | Constraints                        |
|------------|---------------|------------------------------------|
| id         | UUID          | PK                                 |
| vehicle_id | UUID          | FK → vehicles.id, RESTRICT, INDEX  |
| type       | ExpenseType   | NOT NULL, INDEX                    |
| amount     | DECIMAL(12,2) | NOT NULL                           |
| date       | DATE          | NOT NULL, INDEX                    |

**ExpenseType enum:** `MAINTENANCE` | `TOLL` | `OTHER`

## Database Integrity Rules

| Rule | Enforcement |
|------|-------------|
| Unique vehicle registration number | `UNIQUE` constraint on `vehicles.registration_number` |
| Unique driver license number | `UNIQUE` constraint on `drivers.license_number` |
| Unique user email | `UNIQUE` constraint on `users.email` |
| Unique role name | `UNIQUE` constraint on `roles.name` |
| Prevent orphaned trips | `ON DELETE RESTRICT` on trip FKs |
| Prevent orphaned financial records | `ON DELETE RESTRICT` on fuel/expense/maintenance FKs |
| Prevent orphaned users | `ON DELETE RESTRICT` on user → role FK |

## Migration Commands

```bash
# Apply migrations (development)
npm run db:migrate

# Push schema without migration history (prototyping only)
npm run db:push

# Seed roles
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Search & Filter Index Coverage

| Module      | Search Fields                          | Filter Fields              | Indexed |
|-------------|----------------------------------------|----------------------------|---------|
| Vehicles    | registration_number, name, type        | status, type, region       | ✅      |
| Drivers     | name, license_number                   | status                     | ✅      |
| Trips       | id, source, destination, vehicle, driver | status                   | ✅      |
| Maintenance | vehicle, maintenance_type              | status                     | ✅      |
| Fuel Logs   | vehicle, date                          | vehicle, date              | ✅      |
| Expenses    | vehicle, type, date                    | vehicle, type, date        | ✅      |
