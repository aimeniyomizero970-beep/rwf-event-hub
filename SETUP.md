# EMBS / Event Hub — Backend Setup

The app runs without any configuration (local demo mode). To enable real
accounts, bookings, payments, global discovery and live streaming, create the
services below and set the matching environment variables.

> Note: the backend code has not been run in this environment (no dependencies
> could be installed here). Treat the first deploy as a smoke-test.

## 1. Supabase (database + auth)

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`
   (creates tables, RLS policies and RPC functions).
3. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose)
4. (Optional) **Project Settings → Database → Connection string** → `DATABASE_URL`
5. In **Authentication → Providers**, email/password is enabled by default.

## 2. Payments

Pick one provider via `PAYMENT_PROVIDER` (`manual` keeps the original
"pay by MoMo/bank and upload proof" flow).

- **Flutterwave** (recommended — supports RWF): set `FLUTTERWAVE_SECRET_KEY`,
  `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_HASH`. Webhook URL:
  `https://YOUR_DOMAIN/api/payments/webhook/flutterwave`.
- **Paystack** (does not support RWF): `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.
  Webhook: `https://YOUR_DOMAIN/api/payments/webhook/paystack`.
- **MTN MoMo**: `MTN_MOMO_API_URL`, `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`,
  `MTN_MOMO_API_KEY`, `MTN_MOMO_TARGET_ENV`.

## 3. Global event discovery

- Create a Ticketmaster Discovery API key at https://developer.ticketmaster.com
  → `TICKETMASTER_API_KEY`.
- Admins can trigger a sync from the dashboard (or `POST /api/feeds/ticketmaster/sync`).

## 4. Live streaming (Mux)

1. Create an account at https://www.mux.com and an **API Access Token**
   → `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`.
2. Create a **Signing Key** (for private streams) → `MUX_SIGNING_KEY_ID`,
   `MUX_SIGNING_PRIVATE_KEY` (PKCS8 PEM).
3. Add a webhook with secret → `MUX_WEBHOOK_SECRET`, URL:
   `https://YOUR_DOMAIN/api/mux/webhook`.

## 5. Remaining variables

Set `APP_URL` (public site URL) and `SESSION_SECRET` (long random string), plus
the `VITE_*` mirrors and bank/MoMo display details used by the front end. See
`.env.example` for the full list.

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/events`, `GET /api/events/:id`, `POST/PATCH/DELETE /api/events[/:id]`
- `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id` (admin)
- `GET/POST /api/venues`, `PATCH/DELETE /api/venues/:id` (admin)
- `GET/POST /api/reviews`, `DELETE /api/reviews/:id`
- `GET /api/bookings`, `POST /api/bookings`
- `GET /api/ads`, `POST/PATCH/DELETE /api/ads[/:id]`, `POST /api/ads/:id/track`
- `POST /api/payments/create`, `POST /api/payments/webhook/:provider`
- `POST /api/feeds/ticketmaster/sync`, `GET /api/feeds`
- `POST /api/streams`, `GET /api/streams/:eventId`, `POST /api/streams/:id/end`, `POST /api/mux/webhook`
- `GET /api/health` — reports which services are configured
