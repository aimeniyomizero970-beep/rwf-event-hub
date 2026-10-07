import { PaymentRequest, PaymentMethod } from '../../types/payment';

export interface ProviderChargeResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProviderRefundResponse {
  refundId: string;
  success: boolean;
  error?: string;
}

/**
 * Abstract Payment Provider - Base class for all payment providers
 */
export abstract class PaymentProvider {
  abstract supportedMethod: PaymentMethod;

  /**
   * Process a charge/payment
   */
  abstract charge(
    paymentRequest: PaymentRequest,
    transactionId: string
  ): Promise<ProviderChargeResponse>;

  /**
   * Process a refund
   */
  abstract refund(
    transactionId: string,
    amount: number
  ): Promise<ProviderRefundResponse>;

  /**
   * Verify webhook callback from payment provider
   */
  abstract verifyWebhook(webhookData: Record<string, any>): boolean;

  /**
   * Check payment status
   */
  abstract checkStatus(transactionId: string): Promise<string>;
}