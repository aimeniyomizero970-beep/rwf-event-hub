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
