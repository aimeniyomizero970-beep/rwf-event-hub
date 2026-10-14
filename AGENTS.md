# AGENTS.md

## Project

Kigali Events Hub — an Event Management and Booking System (EMBS) web app.

## Stack

- React 19 + TypeScript
- TanStack Start (SSR) + TanStack Router (file-based routing)
- Vite 8
- Tailwind CSS v4 + shadcn/ui
- Bun package manager

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — lint
- `npm run format` — format with Prettier

## Conventions

- Routes live in `src/routes`; the router tree is generated in `src/routeTree.gen.ts`.
- Shared UI primitives live in `src/components/ui`.
- Domain logic and state live under `src/lib/embs`.
- Use the `@/` path alias for imports from `src`.

## Backend

- `src/server.ts` is the SSR entry; it delegates `/api/payments/*` and
  `/api/mux/webhook` to dedicated handlers, then `src/server/api.ts` for the rest.
- `src/server/` is dependency-free: `fetch` against Supabase PostgREST
  (`src/server/db.ts`) and GoTrue auth (`src/server/auth.ts`). No `@supabase/*`
  packages. Streaming/payments/feeds live in `streaming.ts`, `payments.ts`,
  `paymentRoutes.ts`, `feeds/ticketmaster.ts`.
- The whole API is inert until `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
  (`GET /api/health` reports which services are configured).
- Frontend talks to the API via the typed client in `src/lib/api/client.ts`; it
  keeps working in local demo mode when the backend is absent.
- Schema, RLS policies and RPC functions live in `supabase/schema.sql`.
- Setup instructions for accounts/keys are in `SETUP.md`.

