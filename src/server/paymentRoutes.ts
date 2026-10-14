/**
 * Payment HTTP handlers: create-intent and provider webhooks.
 *
 * Mounted from the server entry. The `manual` provider (default) keeps the
 * original instructions-only behaviour so the existing UI works without keys.
 */

import { Db } from "./db";
import { readEnv, hasSupabase } from "./env";
import { resolveSession, ensureUserRow } from "./auth";
import {
  initializePayment,
  parseWebhook,
  recordPaymentEvent,
  settleBooking,
  verifyWebhook,
  type Provider,
} from "./payments";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function makeReference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function handlePaymentCreate(request: Request, rawEnv: unknown): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const env = readEnv(rawEnv);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const paymentMethod = String(body.paymentMethod ?? "");
  const currency = String(body.currency ?? "RWF");
  const eventId = String(body.eventId ?? "");
  const attendeeName = String(body.attendeeName ?? "Guest");
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];

  const provider = env.paymentProvider as Provider;
  const reference = makeReference("pay");

  const manualInstructions = manualInstruction(env, paymentMethod, Number(body.amount ?? 0), currency, reference);

  // Live provider path: needs items + a configured provider + a logged-in user.
  const canChargeLive = provider !== "manual" && items.length > 0 && eventId && hasSupabase(env);
  if (canChargeLive) {
    const session = await resolveSession(env, request);
    if (!session) return json({ ok: false, error: "Authentication required" }, 401);

    const db = new Db(env);
    const user = await ensureUserRow(db, session.user);
    try {
      const bookingId = await db.rpc<string>("create_booking", {
        p_user_id: user.id,
        p_event_id: eventId,
        p_items: items.map((i) => ({ tierId: String(i.tierId), qty: Number(i.qty ?? 1) })),
        p_payment_method: paymentMethod,
        p_attendee_name: attendeeName,
        p_booking_ref: makeReference("BK"),
        p_tx_ref: reference,
        p_payment_provider: provider,
        p_status: "pending",
      });

      const init = await initializePayment(env, {
        amount: Number(body.amount ?? 0),
        currency,
        email: session.user.email,
        name: attendeeName,
        reference,
        callbackUrl: `${env.appUrl}/dashboard/customer`,
        metadata: { eventId, bookingId, paymentMethod },
      });

      return json({
        ok: init.ok,
        status: init.status,
        provider: init.provider,
        reference: init.reference,
        bookingId,
        authorizationUrl: init.authorizationUrl,
        instructions: init.instructions,
        message: init.message,
        paymentMethod,
        currency,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be created.";
      return json({ ok: false, status: "failed", message });
    }
  }

  // Manual / legacy path (no live charging).
  const status = ["Bank transfer", "MoMo Pay", "Cash"].includes(paymentMethod)
    ? "pending_manual_confirmation"
    : "pending_provider_setup";

  return json({
    ok: true,
    status,
    provider: env.paymentProvider,
    reference,
    paymentMethod,
    amount: Number(body.amount ?? 0),
    currency,
    eventId,
    attendeeName,
    message:
      status === "pending_manual_confirmation"
        ? "Payment is awaiting manual confirmation."
        : "This payment method needs provider credentials before live charging can happen.",
    instructions: manualInstructions,
  });
}

export async function handlePaymentWebhook(
  request: Request,
  rawEnv: unknown,
  providerParam: string,
): Promise<Response> {
  const provider = providerParam as Provider;
  if (!["paystack", "flutterwave", "mtn-momo"].includes(provider)) {
    return json({ ok: false, error: "Unknown provider" }, 404);
  }
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const env = readEnv(rawEnv);
  const raw = await request.text();

  const valid = await verifyWebhook(env, provider, raw, request.headers);
  if (!valid) return json({ ok: false, error: "Invalid signature" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const db = new Db(env);
  const state = parseWebhook(provider, payload);

  try {
    await recordPaymentEvent(db, provider, state);
    if (state.reference) {
      await settleBooking(db, state.reference, state.paid);
    }
  } catch (err) {
    console.error("Webhook handling error", err);
  }

  // Always 200 so providers don't retry a payload we already recorded.
  return json({ ok: true, received: true });
}

function manualInstruction(
  env: ReturnType<typeof readEnv>,
  paymentMethod: string,
  amount: number,
  currency: string,
  reference: string,
): string {
  const map: Record<string, string> = {
    "Bank transfer": `Transfer ${amount.toLocaleString()} ${currency} to ${env.bankName} account ${env.bankAccount}. Confirm the payment reference ${reference} after the transfer.`,
    "MoMo Pay": `Send ${amount.toLocaleString()} ${currency} to MoMo account ${env.momoAccount} or phone ${env.momoPhone}. Use reference ${reference}.`,
    "MTN MoMo": `MTN MoMo is not connected. Add MTN_MOMO_API_URL, MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_KEY and MTN_MOMO_USER_ID to enable live payments.`,
    "Airtel Money": `Airtel Money is not connected. Add your Airtel API credentials in the backend environment to enable live payments.`,
    Card: `Card payments require an activated gateway (PAYMENT_PROVIDER=paystack or flutterwave) with credentials.`,
    Cash: `Cash payment is available at a verified RWF Event Hub desk or authorized agent. Confirm at the event desk before admission.`,
  };
  return map[paymentMethod] ?? "Please contact support to complete this payment.";
}
