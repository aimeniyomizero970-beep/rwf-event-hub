/**
 * Live streaming via Mux.
 *
 * Creates Mux live streams for events, exposes HLS playback IDs, optionally
 * signs playback URLs (RS256 JWT), and verifies Mux webhooks (HMAC-SHA256).
 */

import { Db } from "./db";
import { readEnv, type AppEnv } from "./env";

const MUX_API = "https://api.mux.com/video/v1";

function muxAuth(env: AppEnv): string {
  return "Basic " + btoa(`${env.muxTokenId}:${env.muxTokenSecret}`);
}

export interface CreateStreamResult {
  streamId: string;
  playbackId: string | null;
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string | null;
}

export async function createLiveStream(
  env: AppEnv,
  db: Db,
  input: { eventId: string; isPublic?: boolean; price?: number },
): Promise<CreateStreamResult> {
  if (!env.muxTokenId || !env.muxTokenSecret) {
    throw new Error("Mux is not configured (MUX_TOKEN_ID / MUX_TOKEN_SECRET missing).");
  }
  const isPublic = input.isPublic ?? true;
  const policy = isPublic ? "public" : "signed";

  const res = await fetch(`${MUX_API}/live-streams`, {
    method: "POST",
    headers: { Authorization: muxAuth(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      playback_policy: [policy],
      new_asset_settings: { playback_policy: [policy] },
      latency_mode: "low",
      reconnect_window: 60,
      passthrough: input.eventId,
    }),
  });
  const json = (await res.json()) as { data?: Record<string, unknown>; error?: { messages?: string[] } };
  if (!res.ok || !json.data) {
    throw new Error(`Mux create live stream failed: ${json.error?.messages?.join("; ") ?? res.status}`);
  }
  const data = json.data;
  const playbackIds = (data.playback_ids as { id: string }[] | undefined) ?? [];
  const playbackId = playbackIds[0]?.id ?? null;
  const streamKey = String(data.stream_key ?? "");

  const row = await db
    .from<Record<string, unknown>>("streams")
    .insertOne({
      event_id: input.eventId,
      provider: "mux",
      mux_stream_id: String(data.id ?? ""),
      playback_id: playbackId,
      stream_key: streamKey,
      status: "idle",
      is_public: isPublic,
      price: input.price ?? 0,
    });

  return {
    streamId: String(row?.id ?? ""),
    playbackId,
    streamKey,
    rtmpUrl: "rtmps://global-live.mux.com:443/app",
    playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
  };
}

export async function endLiveStream(env: AppEnv, db: Db, streamRowId: string): Promise<boolean> {
  const stream = await db.from<Record<string, unknown>>("streams").select("*").eq("id", streamRowId).maybeSingle();
  if (!stream) return false;

  if (env.muxTokenId && env.muxTokenSecret && stream.mux_stream_id) {
    await fetch(`${MUX_API}/live-streams/${stream.mux_stream_id}/complete`, {
      method: "POST",
      headers: { Authorization: muxAuth(env) },
    });
  }
  await db.from("streams").eq("id", streamRowId).update({ status: "ended", ended_at: new Date().toISOString() });
  return true;
}

export async function getStreamForEvent(db: Db, eventId: string): Promise<Record<string, unknown> | null> {
  return db
    .from<Record<string, unknown>>("streams")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .maybeSingle();
}

/**
 * Sign a Mux playback URL. Requires MUX_SIGNING_KEY_ID + MUX_SIGNING_PRIVATE_KEY
 * (RS256, PKCS8 PEM). Returns a `.m3u8` URL with a `token` query parameter.
 */
export async function signPlaybackUrl(
  env: AppEnv,
  playbackId: string,
  options: { expirationSeconds?: number; audience?: string } = {},
): Promise<string | null> {
  if (!env.muxSigningKeyId || !env.muxSigningPrivateKey) return null;
  const exp = Math.floor(Date.now() / 1000) + (options.expirationSeconds ?? 3600);
  const header = { alg: "RS256", typ: "JWT", kid: env.muxSigningKeyId };
  const payload = { sub: playbackId, aud: options.audience ?? "v", exp, kid: env.muxSigningKeyId };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.muxSigningPrivateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlArr(new Uint8Array(sig))}`;
  return `https://stream.mux.com/${playbackId}.m3u8?token=${jwt}`;
}

export async function verifyMuxWebhook(env: AppEnv, rawBody: string, header: string | null): Promise<boolean> {
  if (!env.muxWebhookSecret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.muxWebhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

export async function handleMuxEvent(
  db: Db,
  payload: { type?: string; data?: Record<string, unknown> },
): Promise<void> {
  const type = payload.type ?? "";
  const data = payload.data ?? {};
  const muxStreamId = data.id ? String(data.id) : "";

  if (type === "video.live_stream.active") {
    await db.from("streams").eq("mux_stream_id", muxStreamId).update({ status: "active", started_at: new Date().toISOString() });
  } else if (type === "video.live_stream.idle") {
    await db.from("streams").eq("mux_stream_id", muxStreamId).update({ status: "idle", ended_at: new Date().toISOString() });
  }
}

// --- Mux webhook entrypoint -------------------------------------------------

export async function handleMuxWebhook(request: Request, rawEnv: unknown): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const env = readEnv(rawEnv);
  const raw = await request.text();
  const valid = await verifyMuxWebhook(env, raw, request.headers.get("mux-signature"));
  if (!valid) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    const payload = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };
    await handleMuxEvent(new Db(env), payload);
  } catch (err) {
    console.error("Mux webhook error", err);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}

// --- base64 / PEM helpers ---------------------------------------------------
function b64url(text: string): string {
  return b64urlArr(new TextEncoder().encode(text));
}

function b64urlArr(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
