/**
 * Authentication via Supabase Auth (email + password).
 *
 * Uses the GoTrue REST API directly. Sessions are carried in a single
 * HttpOnly cookie holding the access + refresh tokens. Every request verifies
 * the access token against Supabase, so a tampered cookie is simply rejected.
 */

import type { AppEnv } from "./env";
import { Db } from "./db";

export const SESSION_COOKIE = "embs_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: "customer" | "organizer" | "admin";
  status?: "active" | "suspended";
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string; user_metadata?: Record<string, unknown> };
}

export interface AppSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

function authBase(env: AppEnv): string {
  return `${env.supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
}

function authHeaders(env: AppEnv): Record<string, string> {
  const key = env.supabaseAnonKey || env.supabaseServiceRoleKey;
  return { apikey: key, "Content-Type": "application/json" };
}

function normalizeSession(raw: SupabaseSession): { session: SupabaseSession; user: AuthUser } {
  const user: AuthUser = {
    id: raw.user.id,
    email: raw.user.email,
    name: (raw.user.user_metadata?.name as string | undefined) ?? undefined,
  };
  return { session: raw, user };
}

async function authFetch(env: AppEnv, path: string, init: RequestInit): Promise<Response> {
  if (!env.supabaseUrl) throw new Error("Supabase is not configured (SUPABASE_URL missing).");
  return fetch(`${authBase(env)}${path}`, {
    ...init,
    headers: { ...authHeaders(env), ...(init.headers ?? {}) },
  });
}

export async function signUp(
  env: AppEnv,
  input: { email: string; password: string; name: string },
): Promise<{ user: AuthUser; session: SupabaseSession | null }> {
  const res = await authFetch(env, "/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: { name: input.name },
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new AuthError((data.msg as string) ?? (data.error_description as string) ?? "Sign up failed", res.status);
  }
  const user = (data.user ?? data) as { id: string; email: string; user_metadata?: Record<string, unknown> };
  const norm = normalizeSession({
    access_token: (data.access_token as string) ?? "",
    refresh_token: (data.refresh_token as string) ?? "",
    expires_in: (data.expires_in as number) ?? 0,
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
  });
  const session = norm.session.access_token ? norm.session : null;
  return { user: norm.user, session };
}

export async function signIn(
  env: AppEnv,
  input: { email: string; password: string },
): Promise<{ session: SupabaseSession; user: AuthUser }> {
  const res = await authFetch(env, "/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new AuthError((data.error_description as string) ?? (data.msg as string) ?? "Invalid credentials", res.status);
  }
  return normalizeSession(data as unknown as SupabaseSession);
}

async function refreshSession(env: AppEnv, refreshToken: string): Promise<SupabaseSession> {
  const res = await authFetch(env, "/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new AuthError("Session refresh failed", res.status);
  return data as unknown as SupabaseSession;
}

export async function verifyAccessToken(env: AppEnv, accessToken: string): Promise<AuthUser | null> {
  const res = await authFetch(env, "/user", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id: string; email: string; user_metadata?: Record<string, unknown> };
  return { id: user.id, email: user.email, name: user.user_metadata?.name as string | undefined };
}

export async function signOut(env: AppEnv, accessToken: string): Promise<void> {
  try {
    await authFetch(env, "/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    /* best effort */
  }
}

// --- Cookie handling -------------------------------------------------------

export function readSessionCookie(request: Request): { accessToken: string; refreshToken: string } | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const raw = parseCookies(header)[SESSION_COOKIE];
  if (!raw) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as { a?: string; r?: string };
    if (!decoded.a) return null;
    return { accessToken: decoded.a, refreshToken: decoded.r ?? "" };
  } catch {
    return null;
  }
}

export function sessionCookieValue(session: SupabaseSession): string {
  const payload = JSON.stringify({ a: session.access_token, r: session.refresh_token });
  return encodeURIComponent(payload);
}

export function sessionSetCookie(session: SupabaseSession, secure = true): string {
  const attrs = [
    `${SESSION_COOKIE}=${sessionCookieValue(session)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function sessionClearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function resolveSession(env: AppEnv, request: Request): Promise<AppSession | null> {
  const cookie = readSessionCookie(request);
  if (!cookie) return null;

  const user = await verifyAccessToken(env, cookie.accessToken);
  if (user) {
    return { user, accessToken: cookie.accessToken, refreshToken: cookie.refreshToken };
  }
  if (!cookie.refreshToken) return null;
  try {
    const refreshed = await refreshSession(env, cookie.refreshToken);
    const fresh = normalizeSession(refreshed);
    return { user: fresh.user, accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token };
  } catch {
    return null;
  }
}

/**
 * Ensure a row exists in public.users for the authenticated auth user, and
 * return it (with role/status). Optionally set a name on first creation.
 */
export async function ensureUserRow(
  db: Db,
  authUser: AuthUser,
  fallbackName?: string,
): Promise<AuthUser> {
  const existing = await db
    .from<Record<string, unknown>>("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (existing) {
    return {
      id: authUser.id,
      email: String(existing.email),
      name: String(existing.name),
      role: existing.role as AuthUser["role"],
      status: existing.status as AuthUser["status"],
    };
  }
  const inserted = await db
    .from<Record<string, unknown>>("users")
    .insertOne({
      auth_user_id: authUser.id,
      name: fallbackName ?? authUser.name ?? authUser.email.split("@")[0],
      email: authUser.email,
      role: "customer",
      status: "active",
    });
  return {
    id: authUser.id,
    email: authUser.email,
    name: String(inserted?.name ?? ""),
    role: (inserted?.role as AuthUser["role"]) ?? "customer",
    status: (inserted?.status as AuthUser["status"]) ?? "active",
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}
