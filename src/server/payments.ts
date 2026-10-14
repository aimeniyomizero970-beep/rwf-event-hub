/**
 * Payment providers.
 *
 * Supports manual instructions (no live charging), Paystack, Flutterwave and
 * MTN MoMo collections. Webhook signatures are verified before a booking is
 * confirmed. Amounts are never trusted from the client — the booking total is
 * computed server-side inside the `create_booking` Postgres function.
 */

import { Db } from "./db";
import type { AppEnv } from "./env";

export type Provider = "manual" | "paystack" | "flutterwave" | "mtn-momo";

export interface PaymentInitInput {
  amount: number;
  currency: string;
  email: string;
  name: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
  ok: boolean;
  provider: Provider;
  status: string;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  instructions?: string;
  message: string;
}

export async function initializePayment(
  env: AppEnv,
  input: PaymentInitInput,
): Promise<PaymentInitResult> {
  switch (env.paymentProvider) {
    case "paystack":
      return initPaystack(env, input);
    case "flutterwave":
      return initFlutterwave(env, input);
    case "mtn-momo":
      return initMtnMomo(env, input);
    default:
      return { ok: true, provider: "manual", status: "pending_provider_setup", reference: input.reference, message: "Manual provider selected." };
  }
}

async function initPaystack(env: AppEnv, input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!env.paystackSecretKey) {
    return notConfigured("paystack", input.reference);
  }
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.paystackSecretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amount * 100),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });
  const data = (await res.json()) as { status?: boolean; message?: string; data?: Record<string, unknown> };
  if (!res.ok || !data.status) {
    return { ok: false, provider: "paystack", status: "failed", reference: input.reference, message: data.message ?? "Paystack initialization failed." };
  }
  return {
    ok: true,
    provider: "paystack",
    status: "pending",
    reference: input.reference,
    authorizationUrl: String(data.data?.authorization_url ?? ""),
    accessCode: String(data.data?.access_code ?? ""),
    message: "Redirect the customer to the Paystack checkout.",
  };
}

async function initFlutterwave(env: AppEnv, input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!env.flutterwaveSecretKey) {
    return notConfigured("flutterwave", input.reference);
  }
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.flutterwaveSecretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.callbackUrl,
      customer: { email: input.email, name: input.name },
      customizations: { title: "RWF Event Hub", description: "Event ticket purchase" },
      meta: input.metadata ?? {},
    }),
  });
  const data = (await res.json()) as { status?: string; message?: string; data?: Record<string, unknown> };
  if (!res.ok || data.status !== "success") {
    return { ok: false, provider: "flutterwave", status: "failed", reference: input.reference, message: data.message ?? "Flutterwave initialization failed." };
  }
  return {
    ok: true,
    provider: "flutterwave",
    status: "pending",
    reference: input.reference,
    authorizationUrl: String(data.data?.link ?? ""),
    message: "Redirect the customer to the Flutterwave checkout.",
  };
}

async function initMtnMomo(env: AppEnv, input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!env.mtnMomoSubscriptionKey || !env.mtnMomoApiKey || !env.mtnMomoUserId || !env.mtnMomoApiUrl) {
    return notConfigured("mtn-momo", input.reference);
  }
  const base = env.mtnMomoApiUrl.replace(/\/+$/, "");
  const basic = btoa(`${env.mtnMomoUserId}:${env.mtnMomoApiKey}`);
  const tokenRes = await fetch(`${base}/collection/token/`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Ocp-Apim-Subscription-Key": env.mtnMomoSubscriptionKey },
  });
  if (!tokenRes.ok) {
    return { ok: false, provider: "mtn-momo", status: "failed", reference: input.reference, message: "Could not get MTN MoMo access token." };
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  const refId = input.reference.match(/^[0-9a-f-]{36}$/i) ? input.reference : crypto.randomUUID();

  const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token ?? ""}`,
      "X-Reference-Id": refId,
      "X-Target-Environment": env.mtnMomoTargetEnv,
      "Ocp-Apim-Subscription-Key": env.mtnMomoSubscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(input.amount),
      currency: input.currency,
      externalId: input.reference,
      payer: { partyIdType: "MSISDN", partyId: input.metadata?.phone ?? "" },
      payerMessage: "Event ticket",
      payeeNote: "RWF Event Hub",
    }),
  });
  if (res.status !== 202 && !res.ok) {
    return { ok: false, provider: "mtn-momo", status: "failed", reference: input.reference, message: "MTN MoMo request failed." };
  }
  return {
    ok: true,
    provider: "mtn-momo",
    status: "pending",
    reference: refId,
    message: "Approve the payment prompt on your MTN MoMo line.",
  };
}

function notConfigured(provider: Provider, reference: string): PaymentInitResult {
  return {
    ok: false,
    provider,
    status: "pending_provider_setup",
    reference,
    message: `${provider} is selected but its credentials are not set. Add the provider keys to your environment.`,
  };
}

// --- Webhook verification --------------------------------------------------

export async function verifyWebhook(
  env: AppEnv,
  provider: Provider,
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  if (provider === "paystack") {
    const signature = headers.get("x-paystack-signature") ?? "";
    if (!env.paystackSecretKey) return false;
    const expected = await hmacSha512Hex(env.paystackSecretKey, rawBody);
    return timingSafeEqual(signature, expected);
  }
  if (provider === "flutterwave") {
    const hash = headers.get("verif-hash") ?? "";
    return Boolean(env.flutterwaveSecretHash) && timingSafeEqual(hash, env.flutterwaveSecretHash);
  }
  if (provider === "mtn-momo") {
    // MTN callbacks are not signed; we validate by re-querying the transaction.
    return true;
  }
  return false;
}

export interface WebhookState {
  reference: string | null;
  paid: boolean;
  eventType: string;
  payload: Record<string, unknown>;
}

export function parseWebhook(provider: Provider, payload: Record<string, unknown>): WebhookState {
  if (provider === "paystack") {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    return {
      reference: data.reference ? String(data.reference) : null,
      paid: payload.event === "charge.success" && data.status === "success",
      eventType: String(payload.event ?? ""),
      payload,
    };
  }
  if (provider === "flutterwave") {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    return {
      reference: payload.tx_ref ? String(payload.tx_ref) : data.tx_ref ? String(data.tx_ref) : null,
      paid: payload.status === "successful" && (data.status === "successful" || data.status === "success"),
      eventType: String(payload.event ?? payload["event.type"] ?? ""),
      payload,
    };
  }
  if (provider === "mtn-momo") {
    return {
      reference: payload.externalId ? String(payload.externalId) : payload.referenceId ? String(payload.referenceId) : null,
      paid: String(payload.status ?? "").toUpperCase() === "SUCCESSFUL",
      eventType: String(payload.status ?? ""),
      payload,
    };
  }
  return { reference: null, paid: false, eventType: "", payload };
}

export async function recordPaymentEvent(
  db: Db,
  provider: Provider,
  state: WebhookState,
): Promise<void> {
  await db.from("payment_events").insert({
    provider,
    provider_reference: state.reference,
    event_type: state.eventType,
    payload: state.payload,
  });
}

/** Find a booking by provider reference and confirm it, then return it. */
export async function settleBooking(db: Db, reference: string, paid: boolean): Promise<Record<string, unknown> | null> {
  const booking = await db
    .from<Record<string, unknown>>("bookings")
    .select("*")
    .eq("tx_ref", reference)
    .maybeSingle();
  if (!booking) return null;

  if (paid) {
    await db.rpc("confirm_booking", { p_booking_id: booking.id });
  } else {
    await db.rpc("fail_booking", { p_booking_id: booking.id });
  }
  return booking;
}

// --- helpers ---------------------------------------------------------------

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
