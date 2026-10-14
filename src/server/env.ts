/**
 * Runtime environment access.
 *
 * Values may arrive either from a Workers-style `env` object (passed to the
 * server entry's `fetch`) or from `process.env` (Node). Runtime env wins.
 */

export type RuntimeEnvInput = unknown;

function pick(runtime: Record<string, unknown>, key: string): string {
  const fromRuntime = runtime[key];
  if (fromRuntime !== undefined && fromRuntime !== null && fromRuntime !== "") {
    return String(fromRuntime);
  }
  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  return fromProcess ?? "";
}

export interface AppEnv {
  appUrl: string;
  sessionSecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  paymentProvider: string;
  paystackSecretKey: string;
  paystackPublicKey: string;
  flutterwaveSecretKey: string;
  flutterwavePublicKey: string;
  flutterwaveSecretHash: string;
  mtnMomoApiUrl: string;
  mtnMomoSubscriptionKey: string;
  mtnMomoApiKey: string;
  mtnMomoUserId: string;
  mtnMomoTargetEnv: string;
  mtnMomoCallbackUrl: string;
  ticketmasterApiKey: string;
  muxTokenId: string;
  muxTokenSecret: string;
  muxWebhookSecret: string;
  muxSigningKeyId: string;
  muxSigningPrivateKey: string;
  bankName: string;
  bankAccount: string;
  momoAccount: string;
  momoPhone: string;
}

export function readEnv(env: RuntimeEnvInput): AppEnv {
  const runtime = (env as Record<string, unknown>) ?? {};
  return {
    appUrl: pick(runtime, "APP_URL") || "http://localhost:5173",
    sessionSecret: pick(runtime, "SESSION_SECRET"),
    supabaseUrl: pick(runtime, "SUPABASE_URL"),
    supabaseAnonKey: pick(runtime, "SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: pick(runtime, "SUPABASE_SERVICE_ROLE_KEY"),
    paymentProvider: pick(runtime, "PAYMENT_PROVIDER") || "manual",
    paystackSecretKey: pick(runtime, "PAYSTACK_SECRET_KEY"),
    paystackPublicKey: pick(runtime, "PAYSTACK_PUBLIC_KEY"),
    flutterwaveSecretKey: pick(runtime, "FLUTTERWAVE_SECRET_KEY"),
    flutterwavePublicKey: pick(runtime, "FLUTTERWAVE_PUBLIC_KEY"),
    flutterwaveSecretHash: pick(runtime, "FLUTTERWAVE_SECRET_HASH"),
    mtnMomoApiUrl: pick(runtime, "MTN_MOMO_API_URL"),
    mtnMomoSubscriptionKey: pick(runtime, "MTN_MOMO_SUBSCRIPTION_KEY"),
    mtnMomoApiKey: pick(runtime, "MTN_MOMO_API_KEY"),
    mtnMomoUserId: pick(runtime, "MTN_MOMO_USER_ID"),
    mtnMomoTargetEnv: pick(runtime, "MTN_MOMO_TARGET_ENV") || "sandbox",
    mtnMomoCallbackUrl: pick(runtime, "MTN_MOMO_CALLBACK_URL"),
    ticketmasterApiKey: pick(runtime, "TICKETMASTER_API_KEY"),
    muxTokenId: pick(runtime, "MUX_TOKEN_ID"),
    muxTokenSecret: pick(runtime, "MUX_TOKEN_SECRET"),
    muxWebhookSecret: pick(runtime, "MUX_WEBHOOK_SECRET"),
    muxSigningKeyId: pick(runtime, "MUX_SIGNING_KEY_ID"),
    muxSigningPrivateKey: pick(runtime, "MUX_SIGNING_PRIVATE_KEY"),
    bankName: pick(runtime, "BANK_NAME") || "BK",
    bankAccount: pick(runtime, "BANK_ACCOUNT") || "",
    momoAccount: pick(runtime, "MOMO_ACCOUNT") || "",
    momoPhone: pick(runtime, "MOMO_PHONE") || "",
  };
}

export function hasSupabase(env: AppEnv): boolean {
  return Boolean(env.supabaseUrl && (env.supabaseServiceRoleKey || env.supabaseAnonKey));
}
