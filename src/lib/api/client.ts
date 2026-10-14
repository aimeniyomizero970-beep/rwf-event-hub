/**
 * Typed client for the `/api` backend.
 *
 * Safe to import anywhere: these calls only do something when the backend is
 * configured (see `getBackendStatus`). The app keeps working without it.
 */

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      credentials: "include",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      ...init,
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as T) : null;
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : errorFrom(data) };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

function errorFrom(data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return "Request failed";
}

export interface BackendStatus {
  ok: boolean;
  supabase: boolean;
  payments: string;
  paystack: boolean;
  flutterwave: boolean;
  mtnMomo: boolean;
  ticketmaster: boolean;
  mux: boolean;
}

let cachedStatus: BackendStatus | null = null;

export async function getBackendStatus(force = false): Promise<BackendStatus | null> {
  if (cachedStatus && !force) return cachedStatus;
  const res = await request<{ ok: boolean; configured: Omit<BackendStatus, "ok"> }>("/health");
  if (!res.ok || !res.data) return null;
  cachedStatus = { ok: res.data.ok, ...res.data.configured };
  return cachedStatus;
}

export function isBackendReady(): Promise<boolean> {
  return getBackendStatus().then((s) => Boolean(s?.supabase));
}

// --- auth -------------------------------------------------------------------

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  // --- catalog ---
  listCategories: () => request("/categories"),
  createCategory: (body: unknown) => request("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: unknown) =>
    request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: "DELETE" }),
  listVenues: () => request("/venues"),
  createVenue: (body: unknown) => request("/venues", { method: "POST", body: JSON.stringify(body) }),
  updateVenue: (id: string, body: unknown) =>
    request(`/venues/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteVenue: (id: string) => request(`/venues/${id}`, { method: "DELETE" }),

  // --- reviews ---
  listReviews: (eventId?: string) => request(`/reviews${eventId ? `?eventId=${eventId}` : ""}`),
  createReview: (body: unknown) => request("/reviews", { method: "POST", body: JSON.stringify(body) }),
  deleteReview: (id: string) => request(`/reviews/${id}`, { method: "DELETE" }),

  // --- events ---
  listEvents: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ""}`);
  },
  getEvent: (id: string) => request(`/events/${id}`),
  createEvent: (body: unknown) => request("/events", { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id: string, body: unknown) =>
    request(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteEvent: (id: string) => request(`/events/${id}`, { method: "DELETE" }),

  // --- bookings ---
  listBookings: (all = false) => request(`/bookings${all ? "?all=1" : ""}`),
  createBooking: (body: unknown) => request("/bookings", { method: "POST", body: JSON.stringify(body) }),

  // --- ads ---
  listAds: (placement?: string) => request(`/ads${placement ? `?placement=${placement}` : ""}`),
  createAd: (body: unknown) => request("/ads", { method: "POST", body: JSON.stringify(body) }),
  updateAd: (id: string, body: unknown) =>
    request(`/ads/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAd: (id: string) => request(`/ads/${id}`, { method: "DELETE" }),
  trackAd: (id: string, field: "impressions" | "clicks") =>
    request(`/ads/${id}/track`, { method: "POST", body: JSON.stringify({ field }) }),

  // --- feeds ---
  listFeeds: () => request("/feeds"),
  syncTicketmaster: (body: unknown = {}) =>
    request("/feeds/ticketmaster/sync", { method: "POST", body: JSON.stringify(body) }),

  // --- streams ---
  createStream: (body: unknown) => request("/streams", { method: "POST", body: JSON.stringify(body) }),
  getStream: (eventId: string) => request(`/streams/${eventId}`),
  endStream: (id: string) => request(`/streams/${id}/end`, { method: "POST" }),
};
