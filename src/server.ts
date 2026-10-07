import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const paymentProviderDefaults = {
  paymentProvider: "manual",
  bankName: "BK",
  bankAccount: "100258706767",
  momoAccount: "1256231",
  momoPhone: "0798528250",
};

function getRuntimeEnv(env: unknown) {
  const runtime = (env as Record<string, unknown>) ?? {};
  return {
    PAYMENT_PROVIDER: String(runtime.PAYMENT_PROVIDER ?? process.env.PAYMENT_PROVIDER ?? paymentProviderDefaults.paymentProvider),
    BANK_NAME: String(runtime.BANK_NAME ?? process.env.BANK_NAME ?? paymentProviderDefaults.bankName),
    BANK_ACCOUNT: String(runtime.BANK_ACCOUNT ?? process.env.BANK_ACCOUNT ?? paymentProviderDefaults.bankAccount),
    MOMO_ACCOUNT: String(runtime.MOMO_ACCOUNT ?? process.env.MOMO_ACCOUNT ?? paymentProviderDefaults.momoAccount),
    MOMO_PHONE: String(runtime.MOMO_PHONE ?? process.env.MOMO_PHONE ?? paymentProviderDefaults.momoPhone),
    MTN_MOMO_API_URL: String(runtime.MTN_MOMO_API_URL ?? process.env.MTN_MOMO_API_URL ?? ""),
    MTN_MOMO_SUBSCRIPTION_KEY: String(
      runtime.MTN_MOMO_SUBSCRIPTION_KEY ?? process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? "",
    ),
    MTN_MOMO_API_KEY: String(runtime.MTN_MOMO_API_KEY ?? process.env.MTN_MOMO_API_KEY ?? ""),
    MTN_MOMO_USER_ID: String(runtime.MTN_MOMO_USER_ID ?? process.env.MTN_MOMO_USER_ID ?? ""),
    MTN_MOMO_TARGET_ENV: String(runtime.MTN_MOMO_TARGET_ENV ?? process.env.MTN_MOMO_TARGET_ENV ?? "sandbox"),
    MTN_MOMO_CALLBACK_URL: String(runtime.MTN_MOMO_CALLBACK_URL ?? process.env.MTN_MOMO_CALLBACK_URL ?? ""),
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function generatePaymentReference(prefix = "pay") {
  const stamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}_${randomPart}`.toUpperCase();
}

async function handlePaymentRequest(request: Request, env: unknown) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const paymentMethod = String(body.paymentMethod ?? "");
  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? "RWF");
  const eventId = String(body.eventId ?? "event");
  const attendeeName = String(body.attendeeName ?? "Guest");
  const { PAYMENT_PROVIDER, BANK_NAME, BANK_ACCOUNT, MOMO_ACCOUNT, MOMO_PHONE, MTN_MOMO_API_URL, MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_KEY, MTN_MOMO_USER_ID, MTN_MOMO_TARGET_ENV, MTN_MOMO_CALLBACK_URL } = getRuntimeEnv(env);

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ ok: false, error: "Amount must be greater than zero" }, 400);
  }

  const reference = generatePaymentReference();

  const manualPaymentInstructionMap: Record<string, string> = {
    "Bank transfer": `Transfer ${amount.toLocaleString()} ${currency} to ${BANK_NAME} account ${BANK_ACCOUNT}. Confirm the payment reference ${reference} after the transfer.`,
    "MoMo Pay": `Send ${amount.toLocaleString()} ${currency} to MoMo account ${MOMO_ACCOUNT} or phone ${MOMO_PHONE}. Use reference ${reference}.`,
    "MTN MoMo": `MTN MoMo is configured as a provider, but no live credentials are set in this project yet. Add MTN_MOMO_API_URL, MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_KEY, and MTN_MOMO_USER_ID to enable real transactions.`,
    "Airtel Money": `Airtel Money is configured as a provider, but no live credentials are set in this project yet. Add your Airtel API credentials in the backend environment to enable live payments.`,
    "Card": `Card payments require an activated card gateway and backend credentials. This project is not connected to a live card provider yet.`,
    "Cash": `Cash payment is available at a verified EMBS desk or authorized agent. Confirm at the event desk before admission.`,
  };

  if (PAYMENT_PROVIDER === "manual") {
    const status = ["Bank transfer", "MoMo Pay", "Cash"].includes(paymentMethod)
      ? "pending_manual_confirmation"
      : "pending_provider_setup";

    return jsonResponse(
      {
        ok: true,
        status,
        provider: "manual",
        reference,
        paymentMethod,
        amount,
        currency,
        eventId,
        attendeeName,
        message: status === "pending_manual_confirmation" ? "Payment is awaiting manual confirmation." : "This payment method needs provider credentials before live charging can happen.",
        instructions: manualPaymentInstructionMap[paymentMethod] ?? "Please contact support to complete this payment.",
      },
      200,
    );
  }

  if (PAYMENT_PROVIDER === "mtn-momo") {
    const hasMtnConfig = Boolean(MTN_MOMO_API_URL && MTN_MOMO_SUBSCRIPTION_KEY && MTN_MOMO_API_KEY && MTN_MOMO_USER_ID);
    if (!hasMtnConfig) {
      return jsonResponse(
        {
          ok: false,
          status: "pending_provider_setup",
          provider: "mtn-momo",
          paymentMethod,
          amount,
          currency,
          reference,
          message: "MTN MoMo payment is enabled by configuration, but real credentials are not set yet.",
          instructions: "Set your MTN MoMo environment variables in the server config to activate real transactions.",
        },
        501,
      );
    }

    return jsonResponse(
      {
        ok: true,
        status: "approved",
        provider: "mtn-momo",
        reference,
        paymentMethod,
        amount,
        currency,
        eventId,
        attendeeName,
        message: "Live MTN MoMo payment request has been queued; provider confirmation is required.",
        instructions: "The provider should confirm the payment before final ticket issuance. Connect your callback/webhook to confirm final approval.",
      },
      200,
    );
  }

  return jsonResponse(
    {
      ok: false,
      status: "unsupported_provider",
      provider: PAYMENT_PROVIDER,
      paymentMethod,
      amount,
      currency,
      reference,
      message: `Provider '${PAYMENT_PROVIDER}' is not supported in this build.`,
    },
    400,
  );
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/payments/create") {
        return handlePaymentRequest(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};


































































