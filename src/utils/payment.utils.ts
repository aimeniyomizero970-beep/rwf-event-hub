import crypto from 'crypto';

/**
 * Generate a unique transaction ID
 */
export const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `TXN-${timestamp}-${randomPart}`.toUpperCase();
};

/**
 * Format currency amount (convert to cents/smallest unit)
 */
export const formatCurrencyAmount = (amount: number, currency: string): number => {
  const divisorMap: Record<string, number> = {
    JPY: 1,
    KWD: 1000,
    BHD: 1000,
    OMR: 1000,
    TND: 1000,
    JOD: 1000,
    IQD: 1000,
    LYD: 1000,
  };

  const divisor = divisorMap[currency] || 100;
  return Math.round(amount * divisor);
};

/**
 * Parse currency amount (convert from cents/smallest unit)
 */
export const parseCurrencyAmount = (amount: number, currency: string): number => {
  const divisorMap: Record<string, number> = {
    JPY: 1,
    KWD: 1000,
    BHD: 1000,
    OMR: 1000,
    TND: 1000,
    JOD: 1000,
    IQD: 1000,
    LYD: 1000,
  };

  const divisor = divisorMap[currency] || 100;
  return amount / divisor;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (E.164 format)
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

/**
 * Generate receipt number
 */
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const datePart = date
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RCP-${datePart}-${randomPart}`;
};

/**
 * Calculate payment processing fee
 */
export const calculateProcessingFee = (
  amount: number,
  paymentMethod: string
): number => {
  const feePercentages: Record<string, number> = {
    credit_card: 0.029, // 2.9%
    debit_card: 0.015, // 1.5%
    mobile_money: 0.02, // 2%
    bank_transfer: 0.01, // 1%
    digital_wallet: 0.025, // 2.5%
  };

  const percentage = feePercentages[paymentMethod] || 0.03;
  return Math.round(amount * percentage * 100) / 100;
};

/**
 * Check if payment is within acceptable amount range
 */
export const isValidPaymentAmount = (
  amount: number,
  min: number = 100,
  max: number = 10000000
): boolean => {
  return amount >= min && amount <= max;
};