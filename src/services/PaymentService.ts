import Payment, { IPayment } from '../models/Payment';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  RefundRequest,
  RefundResponse,
} from '../types/payment';
import { generateTransactionId } from '../utils/payment.utils';
import { PaymentProviderFactory } from './providers/PaymentProviderFactory';

/**
 * Payment Service - Handles all payment-related operations
 */
export class PaymentService {
  /**
   * Process a payment request
   */
  static async processPayment(
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const transactionId = generateTransactionId();

      // Get the appropriate payment provider
      const provider = PaymentProviderFactory.getProvider(
        paymentRequest.paymentMethod
      );

      // Initiate payment with the provider
      const providerResponse = await provider.charge(
        paymentRequest,
        transactionId
      );

      // Create payment record in database
      const paymentRecord: Partial<IPayment> = {
        eventId: paymentRequest.eventId as any,
        userId: paymentRequest.userId as any,
        transactionId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        paymentMethod: paymentRequest.paymentMethod,
        status: providerResponse.success
          ? PaymentStatus.COMPLETED
          : PaymentStatus.FAILED,
        email: paymentRequest.email,
        phoneNumber: paymentRequest.phoneNumber,
        ticketQuantity: paymentRequest.ticketQuantity,
        metadata: providerResponse.metadata,
      };

      await Payment.create(paymentRecord);

      return {
        transactionId,
        status: paymentRecord.status as PaymentStatus,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        paymentMethod: paymentRequest.paymentMethod,
        timestamp: new Date(),
        redirectUrl: providerResponse.redirectUrl,
        error: providerResponse.error,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error(`Payment processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment by transaction ID
   */
  static async getPaymentByTransactionId(
    transactionId: string
  ): Promise<IPayment | null> {
    return Payment.findOne({ transactionId }).exec();
  }

  /**
   * Get all payments for an event
   */
  static async getEventPayments(
    eventId: string,
    status?: PaymentStatus
  ): Promise<IPayment[]> {
    const query: any = { eventId };
    if (status) {
      query.status = status;
    }
    return Payment.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get all payments by a user
   */
  static async getUserPayments(userId: string): Promise<IPayment[]> {
    return Payment.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    transactionId: string,
    status: PaymentStatus
  ): Promise<IPayment | null> {
    return Payment.findOneAndUpdate(
      { transactionId },
      { status },
      { new: true }
    ).exec();
  }

  /**
   * Verify payment webhook callback
   */
  static async verifyPaymentWebhook(
    transactionId: string,
    webhookData: Record<string, any>
  ): Promise<boolean> {
    try {
      const payment = await this.getPaymentByTransactionId(transactionId);
      if (!payment) {
        return false;
      }

      // Verify with payment provider
      const provider = PaymentProviderFactory.getProvider(
        payment.paymentMethod as any
      );
      return provider.verifyWebhook(webhookData);
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Process refund
   */
  static async processRefund(
    refundRequest: RefundRequest
  ): Promise<RefundResponse> {
    try {
      const payment = await this.getPaymentByTransactionId(
        refundRequest.transactionId
      );
      if (!payment) {
        throw new Error('Payment record not found');
      }

      const refundAmount = refundRequest.amount || payment.amount;

      // Get the payment provider and process refund
      const provider = PaymentProviderFactory.getProvider(
        payment.paymentMethod as any
      );
      const refundResult = await provider.refund(
        refundRequest.transactionId,
        refundAmount
      );

      // Update payment status to refunded
      await this.updatePaymentStatus(
        refundRequest.transactionId,
        PaymentStatus.REFUNDED
      );

      return {
        refundId: refundResult.refundId,
        transactionId: refundRequest.transactionId,
        amount: refundAmount,
        status: PaymentStatus.REFUNDED,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error(`Refund processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment statistics for an event
   */
  static async getEventPaymentStats(eventId: string) {
    const payments = await this.getEventPayments(eventId);

    const stats = {
      totalPayments: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      completedPayments: payments.filter(
        (p) => p.status === PaymentStatus.COMPLETED
      ).length,
      failedPayments: payments.filter(
        (p) => p.status === PaymentStatus.FAILED
      ).length,
      refundedAmount: payments
        .filter((p) => p.status === PaymentStatus.REFUNDED)
        .reduce((sum, p) => sum + p.amount, 0),
      totalTicketsSold: payments.reduce((sum, p) => sum + p.ticketQuantity, 0),
      paymentMethods: this.groupByPaymentMethod(payments),
    };

    return stats;
  }

  private static groupByPaymentMethod(payments: IPayment[]) {
    return payments.reduce(
      (acc, payment) => {
        acc[payment.paymentMethod] =
          (acc[payment.paymentMethod] || 0) + payment.amount;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}