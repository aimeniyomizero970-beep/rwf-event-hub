import Stripe from 'stripe';
import { PaymentRequest, PaymentMethod } from '../../../types/payment';
import {
  PaymentProvider,
  ProviderChargeResponse,
  ProviderRefundResponse,
} from '../PaymentProvider';

/**
 * Stripe Payment Provider
 * Handles credit card, debit card, and digital wallet payments via Stripe
 */
export class StripeProvider extends PaymentProvider {
  supportedMethod = PaymentMethod.CREDIT_CARD;
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    super();
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  async charge(
    paymentRequest: PaymentRequest,
    transactionId: string
  ): Promise<ProviderChargeResponse> {
    try {
      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentRequest.amount * 100), // Stripe uses cents
        currency: paymentRequest.currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          eventId: paymentRequest.eventId,
          userId: paymentRequest.userId,
          transactionId,
          ticketQuantity: paymentRequest.ticketQuantity.toString(),
        },
        receipt_email: paymentRequest.email,
      });

      return {
        success: paymentIntent.status === 'succeeded',
        redirectUrl: `${process.env.FRONTEND_URL}/payment/confirm?client_secret=${paymentIntent.client_secret}`,
        metadata: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        },
      };
    } catch (error) {
      console.error('Stripe charge error:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async refund(
    transactionId: string,
    amount: number
  ): Promise<ProviderRefundResponse> {
    try {
      // First, find the payment intent from metadata
      const paymentIntents = await this.stripe.paymentIntents.list({
        limit: 1,
      });

      const paymentIntent = paymentIntents.data.find(
        (pi) => pi.metadata?.transactionId === transactionId
      );

      if (!paymentIntent || !paymentIntent.charges.data[0]) {
        throw new Error('Payment intent or charge not found');
      }

      const chargeId = paymentIntent.charges.data[0].id;

      // Create refund
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: Math.round(amount * 100),
      });

      return {
        refundId: refund.id,
        success: refund.status === 'succeeded',
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        refundId: '',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  verifyWebhook(webhookData: Record<string, any>): boolean {
    try {
      // In production, verify the webhook signature
      // This is simplified - implement full verification with signature
      return webhookData.type && webhookData.data;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  async checkStatus(transactionId: string): Promise<string> {
    try {
      const paymentIntents = await this.stripe.paymentIntents.list({
        limit: 1,
      });

      const paymentIntent = paymentIntents.data.find(
        (pi) => pi.metadata?.transactionId === transactionId
      );

      return paymentIntent?.status || 'unknown';
    } catch (error) {
      console.error('Status check error:', error);
      return 'error';
    }
  }
}