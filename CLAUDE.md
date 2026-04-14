# Gym Member Attendance System

Full-stack attendance tracking platform for multi-tenant gym management.
React frontend + Node.js/Express backend + PostgreSQL database.

## Project Purpose

Track member check-in/check-out, manage member profiles, generate attendance reports,
and handle QR/RFID scanning — across multiple gym tenants with role-based access.

## Architecture

```
/client          → React frontend (Vite)
/server          → Node.js/Express backend
  /routes        → API route handlers
  /middleware    → Auth, tenant isolation, role guards
  /services      → Business logic (attendance, members, reports)
  /db            → PostgreSQL queries and migrations
/shared          → Shared constants, types between client and server
```

## Code Style

- JavaScript ES modules (`import/export`), no CommonJS (`require`)
- Destructure imports when possible: `import { foo } from 'bar'`
- Async/await over `.then()` chains
- No `var` — use `const` by default, `let` only when reassignment is needed
- Let ESLint and Prettier handle formatting — do not add style comments in code

## Commands

```bash
# Development
npm run dev              # Start both client (port 3000) and server (port 4000)
npm run dev:client       # React only
npm run dev:server       # Express only

# Database
npm run db:migrate       # Run pending migrations
npm run db:rollback      # Roll back last migration
npm run db:seed          # Seed dev data

# Testing
npm test                 # Run all Jest tests
npm test -- --testPathPattern=<file>  # Run a single test file

# Linting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint errors
```

## Multi-Tenancy — Critical Rule

Every database query MUST be scoped to `gym_id`. There is no global query that
spans across tenants. The `gym_id` is extracted from the authenticated user's JWT
and injected via middleware — never trust `gym_id` from the request body.

```js
// ✅ Correct
const members = await db.query(
  'SELECT * FROM members WHERE gym_id = $1', [req.gymId]
);

// ❌ Wrong — missing tenant scope
const members = await db.query('SELECT * FROM members');
```

## Role-Based Access

Three roles: `admin`, `staff`, `member`. Each route must use the `requireRole()`
middleware. Never skip the role check even for "simple" endpoints.

```js
router.get('/reports', requireAuth, requireRole('admin', 'staff'), handler);
```

Role hierarchy (descending permission level): admin → staff → member

## Real-Time (WebSocket)

- WebSocket server runs on the same Express instance via `ws` library
- Use for: live check-in/check-out events, dashboard attendance count updates
- Do NOT use WebSocket for: CRUD operations, report generation, auth
- Broadcast events are namespaced by `gym_id` to prevent cross-tenant leakage

## Database Conventions

- Table names: `snake_case`, plural (e.g., `gym_members`, `attendance_logs`)
- All tables must have: `id` (UUID), `gym_id` (UUID FK), `created_at`, `updated_at`
- Soft deletes only — use `deleted_at` timestamp, never `DELETE` member records
- QR/RFID token stored in `members.scan_token` — must be unique per gym

## Key Domain Rules

- A member can only have one open check-in at a time (no `checked_out_at` = still inside)
- Attendance reports aggregate by `gym_id` and date range — always paginate large results
- Scan events (QR/RFID) go through `/api/scan` — validate token, resolve member, log attendance
- `attendance_logs` is append-only — do not update existing rows, insert new events

## Planning Workflow

Before executing any non-trivial task, always enter plan mode and ask the user
clarifying questions first. This is required — do not skip it.

- Use `AskUserQuestion` to gather requirements, resolve ambiguity, and surface
  design choices before writing any code.
- Ask 2–4 focused questions covering scope, UI/UX preferences, edge cases, and
  any decisions that would be hard to reverse later.
- Only proceed to implementation after the user has reviewed and approved the plan.

## Important Notes

- NEVER commit `.env` files — use `.env.example` as the template
- JWT secret and DB credentials live in environment variables only
- All timestamps stored as UTC in PostgreSQL (`TIMESTAMPTZ`)
- See `server/middleware/tenant.js` for how `gym_id` is resolved from JWT
- See `server/db/schema.sql` for the canonical table definitions
