import { PaymentMethod } from '../../types/payment';
import { PaymentProvider } from './PaymentProvider';
import { StripeProvider } from './implementations/StripeProvider';
import { MobileMoneyProvider } from './implementations/MobileMoneyProvider';
import { BankTransferProvider } from './implementations/BankTransferProvider';

/**
 * Factory class to manage payment providers
 */
export class PaymentProviderFactory {
  private static providers: Map<PaymentMethod, PaymentProvider> = new Map();

  /**
   * Initialize all payment providers
   */
  static initialize() {
    this.providers.set(
      PaymentMethod.CREDIT_CARD,
      new StripeProvider()
    );
    this.providers.set(
      PaymentMethod.DEBIT_CARD,
      new StripeProvider()
    );
    this.providers.set(
      PaymentMethod.MOBILE_MONEY,
      new MobileMoneyProvider()
    );
    this.providers.set(
      PaymentMethod.BANK_TRANSFER,
      new BankTransferProvider()
    );
    this.providers.set(
      PaymentMethod.DIGITAL_WALLET,
      new StripeProvider()
    );
  }

  /**
   * Get payment provider by payment method
   */
  static getProvider(paymentMethod: PaymentMethod): PaymentProvider {
    if (!this.providers.has(paymentMethod)) {
      throw new Error(`Payment provider not found for method: ${paymentMethod}`);
    }
    return this.providers.get(paymentMethod)!;
  }

  /**
   * Register a custom payment provider
   */
  static registerProvider(
    paymentMethod: PaymentMethod,
    provider: PaymentProvider
  ) {
    this.providers.set(paymentMethod, provider);
  }

  /**
   * Get all available payment methods
   */
  static getAvailableMethods(): PaymentMethod[] {
    return Array.from(this.providers.keys());
  }
}