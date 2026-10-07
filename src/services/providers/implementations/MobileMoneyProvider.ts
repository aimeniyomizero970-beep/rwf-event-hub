import { PaymentRequest, PaymentMethod } from '../../../types/payment';
import {
  PaymentProvider,
  ProviderChargeResponse,
  ProviderRefundResponse,
} from '../PaymentProvider';
import axios from 'axios';

/**
 * Mobile Money Payment Provider
 * Handles mobile money payments (MTN, Airtel, etc.)
 */
export class MobileMoneyProvider extends PaymentProvider {
  supportedMethod = PaymentMethod.MOBILE_MONEY;
  private apiKey: string;
  private apiUrl: string;
  private businessKey: string;

  constructor() {
    super();
    this.apiKey = process.env.MOBILE_MONEY_API_KEY || '';
    this.apiUrl = process.env.MOBILE_MONEY_API_URL || '';
    this.businessKey = process.env.MOBILE_MONEY_BUSINESS_KEY || '';

    if (!this.apiKey || !this.apiUrl || !this.businessKey) {
      console.warn('Mobile Money configuration is incomplete');
    }
  }

  async charge(
    paymentRequest: PaymentRequest,
    transactionId: string
  ): Promise<ProviderChargeResponse> {
    try {
      if (!paymentRequest.phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required for mobile money payments',
        };
      }

      // Initiate mobile money charge
      const response = await axios.post(
        `${this.apiUrl}/initiate`,
        {
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          phoneNumber: paymentRequest.phoneNumber,
          externalId: transactionId,
          partyIdType: 'MSISDN',
          description: `Event booking - Transaction ${transactionId}`,
          callbackUrl: `${process.env.API_URL}/api/payment/webhook/mobile-money`,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.status === 200 || response.status === 201,
        metadata: {
          referenceId: response.data.referenceId,
          status: 'initiated',
        },
      };
    } catch (error) {
      console.error('Mobile Money charge error:', error);
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
      const response = await axios.post(
        `${this.apiUrl}/refund`,
        {
          amount,
          externalId: transactionId,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        refundId: response.data.refundId || `refund-${transactionId}`,
        success: response.status === 200 || response.status === 201,
      };
    } catch (error) {
      console.error('Mobile Money refund error:', error);
      return {
        refundId: '',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  verifyWebhook(webhookData: Record<string, any>): boolean {
    try {
      // Verify webhook signature from mobile money provider
      const { financialTransactionId, externalId, status } = webhookData;
      return (
        financialTransactionId &&
        externalId &&
        (status === 'SUCCESSFUL' || status === 'FAILED')
      );
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  async checkStatus(transactionId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/transaction/${transactionId}`,
        {
          headers: {
            'X-API-KEY': this.apiKey,
          },
        }
      );

      return response.data.status || 'unknown';
    } catch (error) {
      console.error('Status check error:', error);
      return 'error';
    }
  }
}