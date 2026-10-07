/**
 * Secure Payment Configuration
 * 
 * SECURITY NOTES:
 * - Stripe keys: Publishable key can be public, Secret key MUST stay on server
 * - MTN/Airtel: API credentials stored only in .env, NEVER in code
 * - No phone numbers, bank accounts, or personal data in source code
 * - Environment variables accessed only on server side
 */

export type PaymentProvider = "stripe_card" | "stripe_momo" | "mtn_momo" | "airtel_money";

export interface PaymentMethodConfig {
  id: PaymentProvider;
  label: string;
  description: string;
  icon: string;
  provider: "stripe" | "local";
  enabled: boolean;
  requiresAuth: boolean;
  riskLevel: "low" | "medium" | "high";
}

/**
 * Client-side payment methods - SAFE to expose
 * Actual API keys are NOT included here
 */
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "stripe_card",
    label: "Visa / Mastercard",
    description: "Secure card payment via Stripe",
    icon: "CreditCard",
    provider: "stripe",
    enabled: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
    requiresAuth: false,
    riskLevel: "low",
  },
  {
    id: "stripe_momo",
    label: "MTN MoMo via Stripe",
    description: "Mobile money payment processed securely through Stripe",
    icon: "Smartphone",
    provider: "stripe",
    enabled: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
    requiresAuth: false,
    riskLevel: "low",
  },
  {
    id: "mtn_momo",
    label: "MTN MoMo Direct",
    description: "Direct MTN mobile money - requires manual verification",
    icon: "Smartphone",
    provider: "local",
    enabled: import.meta.env.VITE_MTN_ENABLED === "true",
    requiresAuth: true,
    riskLevel: "medium",
  },
  {
    id: "airtel_money",
    label: "Airtel Money Direct",
    description: "Direct Airtel payment - requires manual verification",
    icon: "Smartphone",
    provider: "local",
    enabled: import.meta.env.VITE_AIRTEL_ENABLED === "true",
    requiresAuth: true,
    riskLevel: "medium",
  },
];

/**
 * Get enabled payment methods for UI
 */
export function getEnabledPaymentMethods(): PaymentMethodConfig[] {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}

/**
 * Check if payment method is Stripe (most secure)
 */
export function isStripeMethod(method: PaymentProvider): boolean {
  return method.startsWith("stripe_");
}

/**
 * Check if payment method requires manual verification
 */
export function requiresManualVerification(method: PaymentProvider): boolean {
  return method === "mtn_momo" || method === "airtel_money";
}
