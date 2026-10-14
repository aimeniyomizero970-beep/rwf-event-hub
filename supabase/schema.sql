-- =============================================================================
-- EMBS / RWF Event Hub — Postgres schema (Supabase)
-- Run in the Supabase SQL editor, or: psql "$DATABASE_URL" -f supabase/schema.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- --- Enums -----------------------------------------------------------------
do $$ begin
  create type user_role as enum ('customer', 'organizer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('published', 'draft', 'completed', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('confirmed', 'pending', 'cancelled');
exception when duplicate_object then null; end $$;

-- --- users -----------------------------------------------------------------
-- Mirrors auth.users (Supabase Auth). `auth_user_id` links to the auth record.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'customer',
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- categories ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image text not null default '',
  created_at timestamptz not null default now()
);

-- --- venues ----------------------------------------------------------------
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  country text not null default 'Rwanda',
  address text not null default '',
  capacity integer not null default 0,
  latitude double precision,
  longitude double precision,
  description text not null default '',
  image text not null default '',
  source text not null default 'local',   -- 'local' | 'ticketmaster' | ...
  external_id text,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

-- --- events ----------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  organizer_id uuid references public.users (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  banner text not null default '',
  status event_status not null default 'pending',
  featured boolean not null default false,
  currency text not null default 'RWF',
  city text not null default '',
  country text not null default 'Rwanda',
  latitude double precision,
  longitude double precision,
  source text not null default 'local',
  external_id text,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_city_idx on public.events (lower(city));
create index if not exists events_status_idx on public.events (status);
create index if not exists events_category_idx on public.events (category_id);

-- --- ticket_tiers ----------------------------------------------------------
create table if not exists public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null default 0,
  currency text not null default 'RWF',
  capacity integer not null default 0,
  sold integer not null default 0,
  created_at timestamptz not null default now(),
  check (sold >= 0 and sold <= capacity)
);

create index if not exists ticket_tiers_event_idx on public.ticket_tiers (event_id);

-- --- bookings --------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  user_id uuid references public.users (id) on delete set null,
  event_id uuid not null references public.events (id) on delete cascade,
  total numeric(12, 2) not null default 0,
  currency text not null default 'RWF',
  status booking_status not null default 'pending',
  payment_method text not null default 'Card',
  payment_provider text not null default 'manual',
  provider_reference text,
  tx_ref text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_event_idx on public.bookings (event_id);

-- --- booking_items ---------------------------------------------------------
create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  tier_id uuid references public.ticket_tiers (id) on delete set null,
  tier_name text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(12, 2) not null default 0
);

create index if not exists booking_items_booking_idx on public.booking_items (booking_id);

-- --- tickets ---------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  tier_name text not null,
  attendee_name text not null default '',
  price numeric(12, 2) not null default 0,
  checked_in boolean not null default false,
  checked_in_at timestamptz
);

create index if not exists tickets_booking_idx on public.tickets (booking_id);

-- --- reviews ---------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reviews_event_idx on public.reviews (event_id);

-- --- ads (sponsored placements) --------------------------------------------
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null,
  title text not null,
  body text not null default '',
  image text not null default '',
  target_url text not null default '',
  placement text not null default 'home_banner', -- home_banner | search_inline | event_sidebar
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  weight integer not null default 1,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ads_placement_idx on public.ads (placement, active);

-- --- streams (live / VOD) --------------------------------------------------
create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  provider text not null default 'mux',
  mux_stream_id text,
  mux_asset_id text,
  playback_id text,
  stream_key text,
  status text not null default 'idle', -- idle | active | ended
  is_public boolean not null default false,
  price numeric(12, 2) not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists streams_event_idx on public.streams (event_id);

-- --- feed_sources (external discovery ingestion) ---------------------------
create table if not exists public.feed_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,        -- 'ticketmaster' | ...
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- --- payment_events (webhook audit log) ------------------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_reference text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists payment_events_ref_idx on public.payment_events (provider, provider_reference);

-- --- updated_at triggers ---------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ declare t text;
begin
  foreach t in array array['users', 'events', 'bookings'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- --- create_booking (atomic; prevents overselling) -------------------------
create or replace function public.create_booking(
  p_user_id uuid,
  p_event_id uuid,
  p_items jsonb,               -- [{"tierId": "...", "qty": 2}]
  p_payment_method text,
  p_attendee_name text,
  p_booking_ref text,
  p_tx_ref text,
  p_payment_provider text default 'manual',
  p_status booking_status default 'pending'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_total numeric := 0;
  v_currency text := 'RWF';
  v_item jsonb;
  v_tier record;
  v_qty integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_BOOKING';
  end if;

  insert into public.bookings (ref, user_id, event_id, total, currency, status, payment_method, payment_provider, tx_ref)
  values (p_booking_ref, p_user_id, p_event_id, 0, 'RWF', p_status, p_payment_method, p_payment_provider, p_tx_ref)
  returning id into v_booking_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));

    select * into v_tier from public.ticket_tiers
      where id = (v_item->>'tierId')::uuid and event_id = p_event_id
      for update;
    if not found then
      raise exception 'TIER_NOT_FOUND';
    end if;
    if v_tier.sold + v_qty > v_tier.capacity then
      raise exception 'SOLD_OUT';
    end if;

    update public.ticket_tiers set sold = sold + v_qty where id = v_tier.id;

    insert into public.booking_items (booking_id, tier_id, tier_name, qty, unit_price)
    values (v_booking_id, v_tier.id, v_tier.name, v_qty, v_tier.price);

    v_total := v_total + (v_tier.price * v_qty);
    v_currency := v_tier.currency;

    insert into public.tickets (code, booking_id, event_id, tier_name, attendee_name, price)
    select
      upper('TKT-' || to_char(now(), 'YYYY') || '-' ||
        substr(md5(random()::text || clock_timestamp()::text || g::text), 1, 6)),
      v_booking_id, p_event_id, v_tier.name, p_attendee_name, v_tier.price
    from generate_series(1, v_qty) as g;
  end loop;

  update public.bookings set total = v_total, currency = coalesce(v_currency, 'RWF') where id = v_booking_id;
  return v_booking_id;
end $$;

-- --- confirm_booking (called after verified payment) -----------------------
create or replace function public.confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
    set status = 'confirmed', updated_at = now()
    where id = p_booking_id and status <> 'confirmed';
end $$;

-- --- fail_booking (release inventory on failed/expired payment) ------------
create or replace function public.fail_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if exists (select 1 from public.bookings where id = p_booking_id and status = 'confirmed') then
    return;
  end if;

  for v_item in select * from public.booking_items where booking_id = p_booking_id loop
    update public.ticket_tiers
      set sold = greatest(0, sold - v_item.qty)
      where id = v_item.tier_id;
  end loop;

  delete from public.tickets where booking_id = p_booking_id;
  update public.bookings set status = 'cancelled', updated_at = now() where id = p_booking_id;
end $$;

-- =============================================================================
-- Row Level Security
-- The server uses the service-role key (bypasses RLS) for all writes and for
-- payment verification. The anon key can only read public-facing data.
-- =============================================================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.tickets enable row level security;
alter table public.reviews enable row level security;
alter table public.ads enable row level security;
alter table public.streams enable row level security;
alter table public.feed_sources enable row level security;
alter table public.payment_events enable row level security;

-- Public (anon) read access ------------------------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);

drop policy if exists venues_public_read on public.venues;
create policy venues_public_read on public.venues for select using (true);

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events for select using (status = 'published');

drop policy if exists tiers_public_read on public.ticket_tiers;
create policy tiers_public_read on public.ticket_tiers for select using (true);

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (true);

drop policy if exists ads_public_read on public.ads;
create policy ads_public_read on public.ads
  for select using (active and (ends_at is null or ends_at > now()));

drop policy if exists streams_public_read on public.streams;
create policy streams_public_read on public.streams
  for select using (is_public and status = 'active');

-- Everything else is service-role only (no anon policies => denied).
