/**
 * Payment Types and Interfaces for RWF Event Hub
 */

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
}

export interface PaymentRequest {
  eventId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  email: string;
  phoneNumber?: string;
  ticketQuantity: number;
}

export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  redirectUrl?: string;
  error?: string;
}

export interface PaymentRecord {
  id: string;
  eventId: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  email: string;
  phoneNumber?: string;
  ticketQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
  amount?: number;
}

export interface RefundResponse {
  refundId: string;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  timestamp: Date;
}