/**
 * Payment Types
 */

export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  ticketTier: string;
  quantity: number;
  totalAmount: number; // in RWF
  status: 'pending' | 'confirmed' | 'cancelled';
  stripeSessionId?: string;
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMetadata {
  eventId: string;
  userId: string;
  ticketTier: string;
  ticketQuantity: number;
}
