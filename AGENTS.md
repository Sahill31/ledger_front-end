# AutoLedger — Frontend

React 19 + Vite 8 + TypeScript (strict) + Tailwind 3 + shadcn-style components.

## Commands

- `npm run dev` — dev server (default port 5173)
- `npm run build` — `tsc -b` + production build (must pass cleanly)
- `npx tsc -b` — typecheck only
- `npm run preview` — serve the production build

## Accounts (seeded in the backend DB — see `server/prisma/seed.ts`)

- `admin@autoledger.com` / `admin123` → admin portal
- `accountant@autoledger.com` / `account123` → accountant (Riverside + Hillcrest)
- `lena@autoledger.com` / `account123` → accountant (Northgate)

## Architecture notes

- `src/services/` — the ONLY layer pages call for data. `api.ts` holds the shared
  fetch client: base URL from `VITE_API_BASE_URL`, Bearer token from the
  session, single-flight refresh on 401, error-envelope mapping to `ApiError`.
- `src/features/{admin,accountant,auth}` — page components; `src/components/ui`
  primitives; `src/components/shared`, `data-table`, `charts`, `layout`.
- Portals: accountant is the primary client (`/login`, `/accountant/*`); admin is
  separate (`/admin/login`, `/admin/*`). `/` redirects by role, unauthenticated
  → `/login`. Guards enforce roles; backend authorization is authoritative.
- Session: JWT access+refresh tokens in `sessionStorage` (`autoledger.session`).
  `UNAUTHENTICATED_EVENT` clears the context user when refresh fails.
- `src/mock/` — removed. All data flows through the real Express/PostgreSQL API.
- Role privacy rule: `budget.service` and admin analytics endpoints
  (`/analytics/*` except `/analytics/my-dashboard`) must never be imported by
  accountant pages or accountant-facing shared code. Backend enforces 403s.
- Document access is via signed URLs from `GET /bills/:id/document-url`
  (private storage — never linked directly).
