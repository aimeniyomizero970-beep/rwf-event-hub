import { Request, Response, NextFunction } from 'express';
import { PaymentMethod } from '../../types/payment';

/**
 * Validate payment request
 */
export const validatePaymentRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { eventId, amount, currency, paymentMethod, ticketQuantity, phoneNumber } =
    req.body;

  // Validate required fields
  if (!eventId || !amount || !currency || !paymentMethod || !ticketQuantity) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      requiredFields: ['eventId', 'amount', 'currency', 'paymentMethod', 'ticketQuantity'],
    });
  }

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number',
    });
  }

  // Validate currency
  if (typeof currency !== 'string' || currency.length !== 3) {
    return res.status(400).json({
      success: false,
      message: 'Currency must be a 3-letter code',
    });
  }

  // Validate payment method
  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Accepted methods: ${Object.values(PaymentMethod).join(', ')}`,
    });
  }

  // Validate ticket quantity
  if (typeof ticketQuantity !== 'number' || ticketQuantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Ticket quantity must be at least 1',
    });
  }

  // Validate phone number for mobile money
  if (
    paymentMethod === PaymentMethod.MOBILE_MONEY &&
    (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber))
  ) {
    return res.status(400).json({
      success: false,
      message: 'Valid phone number is required for mobile money payments',
    });
  }

  next();
};
