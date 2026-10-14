/**
 * JSON API for the app, mounted at `/api` by the server entry.
 *
 * Handlers return a `Response`. `handleApi` returns `null` when the path is not
 * one it owns, so the SSR entry can continue handling the request.
 */

import { Db, DbError } from "./db";
import { readEnv, hasSupabase, type AppEnv } from "./env";
import { syncTicketmaster } from "./feeds/ticketmaster";
import { createLiveStream, endLiveStream, getStreamForEvent, signPlaybackUrl } from "./streaming";
import {
  AuthError,
  ensureUserRow,
  resolveSession,
  sessionClearCookie,
  sessionSetCookie,
  signIn,
  signOut,
  signUp,
  type AuthUser,
} from "./auth";
import {
  serializeAd,
  serializeBooking,
  serializeCategory,
  serializeEvent,
  serializeUser,
  serializeVenue,
} from "./serialize";

interface Ctx {
  request: Request;
  env: AppEnv;
  db: Db;
  url: URL;
  params: Record<string, string>;
  body: unknown;
}

type Handler = (ctx: Ctx) => Promise<Response> | Response;
interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function fail(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

function route(method: string, path: string, handler: Handler): Route {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:[A-Za-z0-9_]+/g, (m) => {
        keys.push(m.slice(1));
        return "([^/]+)";
      }) +
      "/?$",
  );
  return { method, pattern, keys, handler };
}

const routes: Route[] = [
  route("POST", "/api/auth/register", register),
  route("POST", "/api/auth/login", login),
  route("POST", "/api/auth/logout", logout),
  route("GET", "/api/auth/me", me),

  route("GET", "/api/categories", listCategories),
  route("GET", "/api/venues", listVenues),

  route("GET", "/api/events", listEvents),
  route("POST", "/api/events", createEvent),
  route("GET", "/api/events/:id", getEvent),
  route("PATCH", "/api/events/:id", updateEvent),
  route("DELETE", "/api/events/:id", deleteEvent),

  route("GET", "/api/bookings", listBookings),
  route("POST", "/api/bookings", createBooking),

  route("GET", "/api/ads", listAds),
  route("POST", "/api/ads", createAd),
  route("PATCH", "/api/ads/:id", updateAd),
  route("DELETE", "/api/ads/:id", deleteAd),
  route("POST", "/api/ads/:id/track", trackAd),
  route("GET", "/api/feeds", listFeeds),
  route("POST", "/api/feeds/ticketmaster/sync", syncTicketmasterFeed),

  route("POST", "/api/streams", createStream),
  route("POST", "/api/streams/:id/end", endStream),
  route("GET", "/api/streams/:eventId", getStream),

  route("GET", "/api/health", health),
];

export async function handleApi(request: Request, rawEnv: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  // The dedicated payments handler in server.ts owns this path.
  if (url.pathname === "/api/payments/create" || url.pathname.startsWith("/api/payments/webhook")) {
    return null;
  }

  const env = readEnv(rawEnv);
  const db = new Db(env);

  const match = routes.find((r) => r.method === request.method && r.pattern.test(url.pathname));
  if (!match) {
    return fail(`No route for ${request.method} ${url.pathname}`, 404);
  }

  const exec = match.pattern.exec(url.pathname) ?? [];
  const params: Record<string, string> = {};
  match.keys.forEach((key, i) => {
    params[key] = decodeURIComponent(exec[i + 1] ?? "");
  });

  let body: unknown = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.json();
    } catch {
      body = null;
    }
  }

  try {
    if (!hasSupabase(env) && url.pathname !== "/api/health") {
      return fail(
        "Backend not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        503,
      );
    }
    return await match.handler({ request, env, db, url, params, body });
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);
    if (err instanceof HttpError) return fail(err.message, err.status);
    if (err instanceof DbError) {
      const details = typeof err.details === "object" ? JSON.stringify(err.details) : String(err.details ?? "");
      return fail(`Database error: ${err.message} ${details}`.trim(), err.status === 404 ? 404 : 500);
    }
    console.error("API error", err);
    return fail(err instanceof Error ? err.message : "Internal error", 500);
  }
}

// --- Auth ------------------------------------------------------------------

async function register(ctx: Ctx): Promise<Response> {
  const { name, email, password } = (ctx.body ?? {}) as Record<string, string>;
  if (!email || !password) return fail("Email and password are required");
  if (password.length < 8) return fail("Password must be at least 8 characters");

  const { user, session } = await signUp(ctx.env, { email, password, name: name || email });
  await ensureUserRow(ctx.db, user, name);

  if (!session) {
    return json({ ok: true, needsEmailConfirmation: true, user: serializeUser({ ...user, id: user.id }) });
  }
  const headers = { "set-cookie": sessionSetCookie(session, isHttps(ctx.url)) };
  return json({ ok: true, user: await currentProfile(ctx) }, 201, headers);
}

async function login(ctx: Ctx): Promise<Response> {
  const { email, password } = (ctx.body ?? {}) as Record<string, string>;
  if (!email || !password) return fail("Email and password are required");

  const { session, user } = await signIn(ctx.env, { email, password });
  await ensureUserRow(ctx.db, user);
  const headers = { "set-cookie": sessionSetCookie(session, isHttps(ctx.url)) };
  return json({ ok: true, user: await currentProfile(ctx) }, 200, headers);
}

async function logout(ctx: Ctx): Promise<Response> {
  const session = await resolveSession(ctx.env, ctx.request);
  if (session) await signOut(ctx.env, session.accessToken);
  return json({ ok: true }, 200, { "set-cookie": sessionClearCookie() });
}

async function me(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  return json({ ok: true, user: await ensureUserRow(ctx.db, session.user) });
}

// --- Catalog ---------------------------------------------------------------

async function listCategories(ctx: Ctx): Promise<Response> {
  const rows = await ctx.db.from("categories").select("*").order("name").get();
  return json(rows.map(serializeCategory));
}

async function listVenues(ctx: Ctx): Promise<Response> {
  const rows = await ctx.db.from("venues").select("*").order("name").get();
  return json(rows.map(serializeVenue));
}

// --- Events ----------------------------------------------------------------

async function listEvents(ctx: Ctx): Promise<Response> {
  const session = await resolveSession(ctx.env, ctx.request);
  const isStaff = session?.user.role === "organizer" || session?.user.role === "admin";

  const q = ctx.url.searchParams;
  const city = q.get("city");
  const categoryId = q.get("categoryId");
  const status = q.get("status");
  const search = q.get("q");
  const limit = Math.min(Number(q.get("limit") ?? 100) || 100, 200);

  let query = ctx.db.from("events").select("*");
  // Non-staff only ever see published events; staff may filter by status.
  if (isStaff && status) query = query.eq("status", status);
  else if (!isStaff) query = query.eq("status", "published");
  if (city) query = query.ilike("city", city);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (search) query = query.ilike("title", `*${search}*`);

  const rows = await query.order("starts_at", { ascending: true }).limit(limit).get();
  const tiersByEvent = await tiersForEvents(ctx.db, rows.map((r) => String(r.id)));
  return json(rows.map((r) => serializeEvent(r, tiersByEvent[String(r.id)] ?? [])));
}

async function getEvent(ctx: Ctx): Promise<Response> {
  const row = await ctx.db.from("events").select("*").eq("id", ctx.params.id).maybeSingle();
  if (!row) return fail("Event not found", 404);
  const tiers = await ctx.db.from("ticket_tiers").select("*").eq("event_id", ctx.params.id).get();
  return json(serializeEvent(row, tiers));
}

async function createEvent(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["organizer", "admin"]);
  const user = await ensureUserRow(ctx.db, session.user);
  const organizerId = await organizerRowId(ctx.db, user);

  const input = (ctx.body ?? {}) as Record<string, unknown>;
  if (!input.title || !input.date) return fail("title and date are required");

  const eventRow = {
    title: String(input.title),
    description: String(input.description ?? ""),
    category_id: input.categoryId ? String(input.categoryId) : null,
    venue_id: input.venueId ? String(input.venueId) : null,
    organizer_id: organizerId,
    starts_at: String(input.date),
    ends_at: input.endTime ? String(input.endTime) : null,
    banner: String(input.banner ?? ""),
    status: (input.status as string) ?? "pending",
    featured: Boolean(input.featured ?? false),
    currency: String(input.currency ?? "RWF"),
    city: String(input.city ?? ""),
    country: String(input.country ?? "Rwanda"),
  };

  const inserted = await ctx.db.from("events").insertOne(eventRow);
  if (!inserted) return fail("Could not create event", 500);

  const tiers = Array.isArray(input.tiers) ? (input.tiers as Record<string, unknown>[]) : [];
  if (tiers.length) {
    await ctx.db.from("ticket_tiers").insert(
      tiers.map((t) => ({
        event_id: String(inserted.id),
        name: String(t.name ?? "Regular"),
        price: Number(t.price ?? 0),
        capacity: Number(t.capacity ?? 0),
        sold: 0,
      })),
    );
  }

  const freshTiers = await ctx.db.from("ticket_tiers").select("*").eq("event_id", String(inserted.id)).get();
  return json(serializeEvent(inserted, freshTiers), 201);
}

async function updateEvent(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  const existing = await ctx.db.from("events").select("*").eq("id", ctx.params.id).maybeSingle();
  if (!existing) return fail("Event not found", 404);
  await requireEventOwner(ctx, session.user, existing);

  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const map: Record<string, string> = {
    title: "title",
    description: "description",
    banner: "banner",
    status: "status",
    featured: "featured",
    city: "city",
    country: "country",
    categoryId: "category_id",
    venueId: "venue_id",
    date: "starts_at",
    endTime: "ends_at",
  };
  for (const [from, to] of Object.entries(map)) {
    if (from in input) patch[to] = input[from];
  }

  const updated = await ctx.db.from("events").eq("id", ctx.params.id).updateOne(patch);
  const tiers = await ctx.db.from("ticket_tiers").select("*").eq("event_id", ctx.params.id).get();
  return json(serializeEvent(updated ?? existing, tiers));
}

async function deleteEvent(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  const existing = await ctx.db.from("events").select("*").eq("id", ctx.params.id).maybeSingle();
  if (!existing) return fail("Event not found", 404);
  await requireEventOwner(ctx, session.user, existing);
  await ctx.db.from("events").eq("id", ctx.params.id).delete();
  return json({ ok: true });
}

// --- Bookings --------------------------------------------------------------

async function listBookings(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  const user = await ensureUserRow(ctx.db, session.user);
  const isStaff = user.role === "admin";

  let query = ctx.db.from("bookings").select("*");
  if (!(isStaff && ctx.url.searchParams.get("all") === "1")) {
    const userId = await userRowId(ctx.db, user);
    if (!userId) return json([]);
    query = query.eq("user_id", userId);
  }
  const bookings = await query.order("created_at", { ascending: false }).get();
  return json(await hydrateBookings(ctx.db, bookings));
}

async function createBooking(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  const user = await ensureUserRow(ctx.db, session.user);
  const userId = await userRowId(ctx.db, user);
  if (!userId) return fail("User profile not found", 500);

  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const eventId = String(input.eventId ?? "");
  const items = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
  if (!eventId || items.length === 0) return fail("eventId and items are required");

  const paymentMethod = String(input.paymentMethod ?? "Card");
  const attendeeName = String(input.attendeeName ?? user.name ?? "Guest");

  const event = await ctx.db.from("events").select("id").eq("id", eventId).maybeSingle();
  if (!event) return fail("Event not found", 404);

  const provider = ctx.env.paymentProvider;
  const confirmsImmediately = provider === "manual" && ["MTN MoMo", "Airtel Money", "Bank transfer", "MoMo Pay", "Cash"].includes(paymentMethod);
  const status = confirmsImmediately ? "confirmed" : "pending";

  const bookingRef = makeRef("BK");
  const txRef = makeRef("TXN");

  const bookingId = await ctx.db.rpc<string>("create_booking", {
    p_user_id: userId,
    p_event_id: eventId,
    p_items: items.map((i) => ({ tierId: String(i.tierId), qty: Number(i.qty ?? 1) })),
    p_payment_method: paymentMethod,
    p_attendee_name: attendeeName,
    p_booking_ref: bookingRef,
    p_tx_ref: txRef,
    p_payment_provider: provider,
    p_status: status,
  }).catch((err: unknown) => {
    const message = err instanceof DbError ? String(err.message) + " " + JSON.stringify(err.details) : String(err);
    if (message.includes("SOLD_OUT")) throw new HttpError("Not enough tickets available in this tier", 409);
    if (message.includes("TIER_NOT_FOUND")) throw new HttpError("Ticket tier not found", 404);
    throw err;
  });

  const [booking] = await ctx.db.from("bookings").select("*").eq("id", bookingId).get();
  const [hydrated] = await hydrateBookings(ctx.db, [booking]);
  return json(hydrated, 201);
}

// --- Ads -------------------------------------------------------------------

async function listAds(ctx: Ctx): Promise<Response> {
  const placement = ctx.url.searchParams.get("placement");
  let query = ctx.db.from("ads").select("*").eq("active", true);
  if (placement) query = query.eq("placement", placement);
  const rows = await query.order("weight", { ascending: false }).get();
  return json(rows.map(serializeAd));
}

async function createAd(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["admin"]);
  const input = (ctx.body ?? {}) as Record<string, unknown>;
  if (!input.title || !input.advertiser) return fail("advertiser and title are required");
  const row = await ctx.db.from("ads").insertOne({
    advertiser: String(input.advertiser),
    title: String(input.title),
    body: String(input.body ?? ""),
    image: String(input.image ?? ""),
    target_url: String(input.targetUrl ?? ""),
    placement: String(input.placement ?? "home_banner"),
    starts_at: input.startsAt ? String(input.startsAt) : new Date().toISOString(),
    ends_at: input.endsAt ? String(input.endsAt) : null,
    active: input.active === undefined ? true : Boolean(input.active),
    weight: Number(input.weight ?? 1),
  });
  return json(serializeAd(row ?? {}), 201);
}

async function updateAd(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["admin"]);
  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const map: Record<string, string> = {
    advertiser: "advertiser",
    title: "title",
    body: "body",
    image: "image",
    targetUrl: "target_url",
    placement: "placement",
    startsAt: "starts_at",
    endsAt: "ends_at",
    active: "active",
    weight: "weight",
  };
  for (const [from, to] of Object.entries(map)) {
    if (from in input) patch[to] = input[from];
  }
  const row = await ctx.db.from("ads").eq("id", ctx.params.id).updateOne(patch);
  if (!row) return fail("Ad not found", 404);
  return json(serializeAd(row));
}

async function deleteAd(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["admin"]);
  await ctx.db.from("ads").eq("id", ctx.params.id).delete();
  return json({ ok: true });
}

async function trackAd(ctx: Ctx): Promise<Response> {
  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const field = String(input.field ?? "impressions");
  if (field !== "impressions" && field !== "clicks") return fail("field must be impressions or clicks");
  await ctx.db.rpc("track_ad", { p_ad_id: ctx.params.id, p_field: field });
  return json({ ok: true });
}

async function listFeeds(ctx: Ctx): Promise<Response> {  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["admin"]);
  const rows = await ctx.db.from("feed_sources").select("*").order("provider").get();
  return json(
    rows.map((r) => ({
      provider: String(r.provider),
      name: String(r.name),
      enabled: r.enabled === true,
      lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    })),
  );
}

async function syncTicketmasterFeed(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["admin"]);
  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const result = await syncTicketmaster(ctx.env, ctx.db, {
    city: input.city ? String(input.city) : ctx.url.searchParams.get("city") ?? undefined,
    keyword: input.keyword ? String(input.keyword) : undefined,
    countryCode: input.countryCode ? String(input.countryCode) : undefined,
    size: input.size ? Number(input.size) : undefined,
    pages: input.pages ? Number(input.pages) : undefined,
  });
  return json({ ok: true, ...result });
}

async function createStream(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["organizer", "admin"]);
  const input = (ctx.body ?? {}) as Record<string, unknown>;
  const eventId = String(input.eventId ?? "");
  if (!eventId) return fail("eventId is required");
  const event = await ctx.db.from("events").select("id").eq("id", eventId).maybeSingle();
  if (!event) return fail("Event not found", 404);

  const result = await createLiveStream(ctx.env, ctx.db, {
    eventId,
    isPublic: input.isPublic === undefined ? true : Boolean(input.isPublic),
    price: Number(input.price ?? 0),
  });
  return json({ ok: true, ...result }, 201);
}

async function getStream(ctx: Ctx): Promise<Response> {
  const stream = await getStreamForEvent(ctx.db, ctx.params.eventId);
  if (!stream) return fail("No stream for this event", 404);

  const playbackId = stream.playback_id ? String(stream.playback_id) : null;
  const isPublic = stream.is_public === true;
  let playbackUrl: string | null = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;

  if (!isPublic) {
    const session = await resolveSession(ctx.env, ctx.request);
    if (!session) return fail("Sign in to watch this stream", 401);
    if (playbackId) playbackUrl = await signPlaybackUrl(ctx.env, playbackId, { audience: "v" });
  }

  return json({
    eventId: ctx.params.eventId,
    status: String(stream.status),
    isPublic,
    price: Number(stream.price ?? 0),
    playbackUrl,
  });
}

async function endStream(ctx: Ctx): Promise<Response> {
  const session = await requireUser(ctx);
  await requireRole(ctx, session.user, ["organizer", "admin"]);
  const ok = await endLiveStream(ctx.env, ctx.db, ctx.params.id);
  if (!ok) return fail("Stream not found", 404);
  return json({ ok: true });
}

async function health(ctx: Ctx): Promise<Response> {
  return json({
    ok: true,
    configured: {
      supabase: Boolean(ctx.env.supabaseUrl && ctx.env.supabaseServiceRoleKey),
      payments: ctx.env.paymentProvider,
      paystack: Boolean(ctx.env.paystackSecretKey),
      flutterwave: Boolean(ctx.env.flutterwaveSecretKey),
      mtnMomo: Boolean(ctx.env.mtnMomoApiUrl && ctx.env.mtnMomoSubscriptionKey),
      ticketmaster: Boolean(ctx.env.ticketmasterApiKey),
      mux: Boolean(ctx.env.muxTokenId && ctx.env.muxTokenSecret),
    },
  });
}

// --- helpers ---------------------------------------------------------------

async function currentProfile(ctx: Ctx): Promise<unknown> {
  const session = await resolveSession(ctx.env, ctx.request);
  if (!session) return null;
  const user = await ensureUserRow(ctx.db, session.user);
  return serializeUser({ ...user, created_at: new Date().toISOString() });
}

async function requireUser(ctx: Ctx) {
  const session = await resolveSession(ctx.env, ctx.request);
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}

async function requireRole(ctx: Ctx, user: AuthUser, roles: string[]): Promise<void> {
  const profile = await ensureUserRow(ctx.db, user);
  if (!roles.includes(profile.role ?? "customer")) {
    throw new AuthError("Insufficient permissions", 403);
  }
}

async function requireEventOwner(ctx: Ctx, user: AuthUser, event: Record<string, unknown>): Promise<void> {
  const profile = await ensureUserRow(ctx.db, user);
  if (profile.role === "admin") return;
  const ownerId = await userRowId(ctx.db, profile);
  if (!ownerId || String(event.organizer_id) !== ownerId) {
    throw new AuthError("You do not own this event", 403);
  }
}

async function userRowId(ctx: Db, user: AuthUser): Promise<string | null> {
  const row = await ctx
    .from<Record<string, unknown>>("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return row ? String(row.id) : null;
}

async function organizerRowId(ctx: Db, user: AuthUser): Promise<string | null> {
  return userRowId(ctx, user);
}

async function tiersForEvents(db: Db, eventIds: string[]): Promise<Record<string, Record<string, unknown>[]>> {
  if (eventIds.length === 0) return {};
  const rows = await db.from("ticket_tiers").select("*").inList("event_id", eventIds).get();
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const row of rows) {
    const key = String(row.event_id);
    (grouped[key] ??= []).push(row);
  }
  return grouped;
}

async function hydrateBookings(db: Db, bookings: Record<string, unknown>[]): Promise<unknown[]> {
  if (bookings.length === 0) return [];
  const ids = bookings.map((b) => String(b.id));

  const [items, tickets] = await Promise.all([
    db.from("booking_items").select("*").inList("booking_id", ids).get(),
    db.from("tickets").select("*").inList("booking_id", ids).get(),
  ]);

  return bookings.map((b) => {
    const id = String(b.id);
    return serializeBooking(
      b,
      items.filter((i) => String(i.booking_id) === id),
      tickets.filter((t) => String(t.booking_id) === id),
    );
  });
}

function makeRef(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function isHttps(url: URL): boolean {
  return url.protocol === "https:";
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
