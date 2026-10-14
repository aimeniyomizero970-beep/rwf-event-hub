/**
 * Ticketmaster Discovery API ingestion.
 *
 * Pulls events (US/CA/UK/EU/AU/NZ) into our `venues` + `events` tables, keyed
 * by (source, external_id) so repeat syncs update instead of duplicating.
 * Ticketmaster has no price data and no African coverage, so these events are
 * discovery-only: they carry an external_url and no local ticket tiers.
 */

import { Db } from "../db";
import type { AppEnv } from "../env";

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

interface TmImage {
  url: string;
  ratio?: string;
  width?: number;
}

interface TmVenue {
  id: string;
  name?: string;
  city?: { name?: string };
  country?: { countryCode?: string; name?: string };
  address?: { line1?: string };
  location?: { latitude?: string; longitude?: string };
  images?: TmImage[];
}

interface TmEvent {
  id: string;
  name?: string;
  description?: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  _embedded?: { venues?: TmVenue[] };
}

export interface SyncOptions {
  city?: string;
  keyword?: string;
  countryCode?: string;
  size?: number;
  pages?: number;
}

export interface SyncResult {
  fetched: number;
  events: number;
  venues: number;
}

function pickImage(images: TmImage[] | undefined, ratio: string): string {
  if (!images || images.length === 0) return "";
  const match = images.find((img) => img.ratio === ratio) ?? images[0];
  return match?.url ?? "";
}

export async function syncTicketmaster(
  env: AppEnv,
  db: Db,
  options: SyncOptions = {},
): Promise<SyncResult> {
  if (!env.ticketmasterApiKey) {
    throw new Error("Ticketmaster is not configured (TICKETMASTER_API_KEY missing).");
  }

  const size = Math.min(options.size ?? 100, 200);
  const pages = Math.max(1, options.pages ?? 1);
  let fetched = 0;
  let events = 0;
  const venueIds = new Set<string>();

  for (let page = 0; page < pages; page += 1) {
    const params = new URLSearchParams({
      apikey: env.ticketmasterApiKey,
      size: String(size),
      page: String(page),
      sort: "date,asc",
    });
    if (options.city) params.set("city", options.city);
    if (options.keyword) params.set("keyword", options.keyword);
    if (options.countryCode) params.set("countryCode", options.countryCode);

    const res = await fetch(`${TM_BASE}/events.json?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Ticketmaster request failed (${res.status})`);
    }
    const json = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    const batch = json._embedded?.events ?? [];
    if (batch.length === 0) break;
    fetched += batch.length;

    for (const tmEvent of batch) {
      const tmVenue = tmEvent._embedded?.venues?.[0];
      let venueRowId: string | null = null;

      if (tmVenue?.id) {
        const [venue] = await db.from<Record<string, unknown>>("venues").upsert(
          {
            source: "ticketmaster",
            external_id: tmVenue.id,
            name: tmVenue.name ?? "Unknown venue",
            city: tmVenue.city?.name ?? "",
            country: tmVenue.country?.name ?? tmVenue.country?.countryCode ?? "",
            address: tmVenue.address?.line1 ?? "",
            latitude: tmVenue.location?.latitude ? Number(tmVenue.location.latitude) : null,
            longitude: tmVenue.location?.longitude ? Number(tmVenue.location.longitude) : null,
            image: pickImage(tmVenue.images, "4_3"),
          },
          "source,external_id",
        );
        venueRowId = venue ? String(venue.id) : null;
        if (venueRowId) venueIds.add(venueRowId);
      }

      const startsAt = tmEvent.dates?.start?.dateTime ?? tmEvent.dates?.start?.localDate;
      if (!startsAt) continue;

      await db.from<Record<string, unknown>>("events").upsert(
        {
          source: "ticketmaster",
          external_id: tmEvent.id,
          title: tmEvent.name ?? "Untitled event",
          description: tmEvent.description ?? "",
          starts_at: new Date(startsAt).toISOString(),
          banner: pickImage(tmEvent.images, "16_9"),
          status: "published",
          currency: "USD",
          city: tmVenue?.city?.name ?? "",
          country: tmVenue?.country?.name ?? tmVenue?.country?.countryCode ?? "",
          latitude: tmVenue?.location?.latitude ? Number(tmVenue.location.latitude) : null,
          longitude: tmVenue?.location?.longitude ? Number(tmVenue.location.longitude) : null,
          external_url: tmEvent.url ?? null,
          venue_id: venueRowId,
        },
        "source,external_id",
      );
      events += 1;
    }
  }

  await db
    .from("feed_sources")
    .upsert(
      { provider: "ticketmaster", name: "Ticketmaster", enabled: true, last_synced_at: new Date().toISOString() },
      "provider",
    );

  return { fetched, events, venues: venueIds.size };
}
