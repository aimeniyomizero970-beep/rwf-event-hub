import { PaymentRequest, PaymentMethod } from '../../../types/payment';
import {
  PaymentProvider,
  ProviderChargeResponse,
  ProviderRefundResponse,
} from '../PaymentProvider';

/**
 * Bank Transfer Payment Provider
 * Handles bank transfer payments - generates bank details and tracks payments
 */
export class BankTransferProvider extends PaymentProvider {
  supportedMethod = PaymentMethod.BANK_TRANSFER;
  private bankAccountNumber: string;
  private bankName: string;
  private bankCode: string;

  constructor() {
    super();
    this.bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '';
    this.bankName = process.env.BANK_NAME || '';
    this.bankCode = process.env.BANK_CODE || '';

    if (!this.bankAccountNumber || !this.bankName) {
      console.warn('Bank configuration is incomplete');
    }
  }

  async charge(
    paymentRequest: PaymentRequest,
    transactionId: string
  ): Promise<ProviderChargeResponse> {
    try {
      // Generate unique reference for bank transfer
      const transferReference = `RWF-${transactionId}`;

      return {
        success: true,
        metadata: {
          transferReference,
          bankName: this.bankName,
          bankCode: this.bankCode,
          accountNumber: this.maskAccountNumber(this.bankAccountNumber),
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          description: `Payment for event ${paymentRequest.eventId}. Reference: ${transferReference}`,
          instructions:
            'Please include the reference number in your transfer to complete the payment.',
          status: 'awaiting_payment',
        },
      };
    } catch (error) {
      console.error('Bank transfer charge error:', error);
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
      // For bank transfers, refunds are manual
      return {
        refundId: `refund-${transactionId}`,
        success: true,
      };
    } catch (error) {
      console.error('Bank transfer refund error:', error);
      return {
        refundId: '',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  verifyWebhook(webhookData: Record<string, any>): boolean {
    try {
      // Verify bank transfer webhook (from bank's API)
      const { reference, amount, status } = webhookData;
      return (
        reference &&
        amount &&
        (status === 'COMPLETED' || status === 'PENDING')
      );
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  async checkStatus(transactionId: string): Promise<string> {
    try {
      // For bank transfers, status must be manually updated via webhooks or admin
      // This is a placeholder implementation
      return 'pending';
    } catch (error) {
      console.error('Status check error:', error);
      return 'error';
    }
  }

  private maskAccountNumber(accountNumber: string): string {
    return accountNumber.slice(-4).padStart(accountNumber.length, '*');
  }
}