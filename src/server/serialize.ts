/**
 * Map Postgres rows (snake_case) to the JSON shapes the frontend already uses.
 */

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return v === null || v === undefined ? fallback : String(v);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

export function serializeCategory(row: Row) {
  return {
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    description: str(row.description),
    image: str(row.image),
  };
}

export function serializeVenue(row: Row) {
  return {
    id: str(row.id),
    name: str(row.name),
    city: str(row.city),
    country: str(row.country),
    address: str(row.address),
    capacity: num(row.capacity),
    latitude: row.latitude === null || row.latitude === undefined ? null : num(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : num(row.longitude),
    description: str(row.description),
    image: str(row.image),
  };
}

export function serializeTier(row: Row) {
  return {
    id: str(row.id),
    name: str(row.name),
    price: num(row.price),
    capacity: num(row.capacity),
    sold: num(row.sold),
  };
}

export function serializeEvent(row: Row, tiers: Row[] = []) {
  return {
    id: str(row.id),
    title: str(row.title),
    description: str(row.description),
    categoryId: str(row.category_id),
    venueId: str(row.venue_id),
    organizerId: str(row.organizer_id),
    date: str(row.starts_at),
    endTime: str(row.ends_at),
    banner: str(row.banner),
    status: str(row.status, "pending"),
    featured: bool(row.featured),
    currency: str(row.currency, "RWF"),
    city: str(row.city),
    country: str(row.country),
    source: str(row.source, "local"),
    externalUrl: row.external_url ? str(row.external_url) : null,
    tiers: tiers.map(serializeTier),
  };
}

export function serializeBooking(row: Row, items: Row[] = [], tickets: Row[] = []) {
  return {
    id: str(row.id),
    ref: str(row.ref),
    userId: str(row.user_id),
    eventId: str(row.event_id),
    items: items.map((i) => ({
      tierId: str(i.tier_id),
      tierName: str(i.tier_name),
      qty: num(i.qty),
      price: num(i.unit_price),
    })),
    total: num(row.total),
    currency: str(row.currency, "RWF"),
    status: str(row.status, "pending"),
    paymentMethod: str(row.payment_method),
    txRef: str(row.tx_ref),
    createdAt: str(row.created_at),
    tickets: tickets.map(serializeTicket),
  };
}

export function serializeTicket(row: Row) {
  return {
    id: str(row.id),
    code: str(row.code),
    bookingId: str(row.booking_id),
    eventId: str(row.event_id),
    tierName: str(row.tier_name),
    attendeeName: str(row.attendee_name),
    price: num(row.price),
    checkedIn: bool(row.checked_in),
  };
}

export function serializeUser(row: Row) {
  return {
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    phone: row.phone ? str(row.phone) : undefined,
    role: str(row.role, "customer"),
    status: str(row.status, "active"),
    createdAt: str(row.created_at),
  };
}

export function serializeAd(row: Row) {
  return {
    id: str(row.id),
    advertiser: str(row.advertiser),
    title: str(row.title),
    body: str(row.body),
    image: str(row.image),
    targetUrl: str(row.target_url),
    placement: str(row.placement),
    active: bool(row.active),
    startsAt: str(row.starts_at),
    endsAt: row.ends_at ? str(row.ends_at) : null,
  };
}

export function serializeStream(row: Row) {
  return {
    id: str(row.id),
    eventId: str(row.event_id),
    provider: str(row.provider, "mux"),
    playbackId: row.playback_id ? str(row.playback_id) : null,
    status: str(row.status, "idle"),
    isPublic: bool(row.is_public),
    price: num(row.price),
    startedAt: row.started_at ? str(row.started_at) : null,
    endedAt: row.ended_at ? str(row.ended_at) : null,
  };
}
