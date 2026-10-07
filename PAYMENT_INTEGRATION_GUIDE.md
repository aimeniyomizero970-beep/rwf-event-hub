# RWF Event Hub - Payment Integration Guide

## Overview

This document provides a complete guide for the payment mode integration in the RWF Event Hub platform. The payment system supports multiple payment methods including credit/debit cards, mobile money, bank transfers, and digital wallets.

## Supported Payment Methods

1. **Credit Card & Debit Card** - Via Stripe
2. **Mobile Money** - MTN, Airtel, and other providers
3. **Bank Transfer** - Manual bank transfers with automated tracking
4. **Digital Wallet** - Support for various digital payment solutions

## Architecture

### Project Structure

```
src/
├── types/
│   └── payment.ts                 # Payment interfaces and enums
├── models/
│   └── Payment.ts                 # MongoDB Payment schema
├── services/
│   ├── PaymentService.ts          # Core payment business logic
│   └── providers/
│       ├── PaymentProvider.ts     # Abstract payment provider
│       ├── PaymentProviderFactory.ts # Provider factory pattern
│       └── implementations/
│           ├── StripeProvider.ts       # Stripe implementation
│           ├── MobileMoneyProvider.ts  # Mobile Money implementation
│           └── BankTransferProvider.ts # Bank Transfer implementation
├── routes/
│   └── paymentRoutes.ts           # Payment API endpoints
├── middleware/
│   └── validators/
│       └── paymentValidator.ts    # Request validation
└── utils/
    └── payment.utils.ts           # Utility functions
```

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

#### Stripe Configuration
```env
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

Get your keys from: https://dashboard.stripe.com/apikeys

#### Mobile Money Configuration
```env
MOBILE_MONEY_API_KEY=your_api_key
MOBILE_MONEY_API_URL=https://api.provider.com
MOBILE_MONEY_BUSINESS_KEY=your_business_key
```

#### Bank Transfer Configuration
```env
BANK_ACCOUNT_NUMBER=your_account_number
BANK_NAME=Your Bank Name
BANK_CODE=0000
```

### 2. Install Dependencies

```bash
npm install stripe axios
```

### 3. Initialize Payment Providers

In your main app initialization file (e.g., `server.ts`):

```typescript
import { PaymentProviderFactory } from './services/providers/PaymentProviderFactory';

// Initialize all payment providers
PaymentProviderFactory.initialize();
```

### 4. Register Payment Routes

In your main app file:

```typescript
import paymentRoutes from './routes/paymentRoutes';

app.use('/api/payment', paymentRoutes);
```

## API Endpoints

### Process Payment
```
POST /api/payment/charge

Body:
{
  "eventId": "event_id",
  "amount": 50000,
  "currency": "RWF",
  "paymentMethod": "credit_card",
  "ticketQuantity": 2,
  "phoneNumber": "+250788123456" // Optional, required for mobile_money
}

Response:
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "TXN-...",
    "status": "completed",
    "amount": 50000,
    "currency": "RWF",
    "paymentMethod": "credit_card",
    "timestamp": "2024-10-07T...",
    "redirectUrl": "https://..."
  }
}
```

### Get Payment Details
```
GET /api/payment/:transactionId

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "eventId": "...",
    "userId": "...",
    "transactionId": "TXN-...",
    "amount": 50000,
    "currency": "RWF",
    "status": "completed",
    ...
  }
}
```

### Get Event Payments
```
GET /api/payment/event/:eventId?status=completed

Response:
{
  "success": true,
  "data": [
    { /* payment records */ }
  ]
}
```

### Get User Payments
```
GET /api/payment/user/my-payments

Response:
{
  "success": true,
  "data": [
    { /* payment records */ }
  ]
}
```

### Process Refund
```
POST /api/payment/refund

Body:
{
  "transactionId": "TXN-...",
  "reason": "Customer requested refund",
  "amount": 50000 // Optional, full refund if not specified
}

Response:
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "REF-...",
    "transactionId": "TXN-...",
    "amount": 50000,
    "status": "refunded",
    "timestamp": "2024-10-07T..."
  }
}
```

### Get Payment Statistics
```
GET /api/payment/event/:eventId/stats

Response:
{
  "success": true,
  "data": {
    "totalPayments": 50,
    "totalRevenue": 2500000,
    "completedPayments": 48,
    "failedPayments": 2,
    "refundedAmount": 0,
    "totalTicketsSold": 120,
    "paymentMethods": {
      "credit_card": 2000000,
      "mobile_money": 500000
    }
  }
}
```

## Webhook Handling

### Stripe Webhook
```
POST /api/payment/webhook/stripe

Expected events:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
```

**Setup in Stripe Dashboard:**
1. Go to Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/payment/webhook/stripe`
3. Select events: `payment_intent.*`, `charge.refunded`

### Mobile Money Webhook
```
POST /api/payment/webhook/mobile-money

Body:
{
  "externalId": "TXN-...",
  "status": "SUCCESSFUL",
  "financialTransactionId": "..."
}
```

### Bank Transfer Webhook
```
POST /api/payment/webhook/bank

Body:
{
  "reference": "RWF-TXN-...",
  "status": "COMPLETED",
  "amount": 50000
}
```

## Usage Examples

### Client-Side (Frontend)

```typescript
// Process a payment
async function processPayment(eventId: string, ticketQuantity: number) {
  const response = await fetch('/api/payment/charge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      eventId,
      amount: 50000,
      currency: 'RWF',
      paymentMethod: 'credit_card',
      ticketQuantity
    })
  });

  const result = await response.json();
  
  if (result.data.redirectUrl) {
    window.location.href = result.data.redirectUrl;
  }
}

// Get payment status
async function getPaymentStatus(transactionId: string) {
  const response = await fetch(`/api/payment/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
}
```

## Error Handling

The payment system includes comprehensive error handling:

```typescript
try {
  const result = await PaymentService.processPayment(paymentRequest);
  
  if (!result.success) {
    console.error('Payment failed:', result.error);
    // Handle payment failure
  }
} catch (error) {
  console.error('Payment error:', error);
  // Handle unexpected errors
}
```

## Security Considerations

1. **API Keys**: Never commit `.env` file with real keys
2. **HTTPS**: Always use HTTPS in production
3. **Webhook Verification**: Verify webhook signatures from payment providers
4. **PCI Compliance**: Never store full credit card details on your server
5. **Rate Limiting**: Implement rate limiting on payment endpoints
6. **Input Validation**: All payment requests are validated
7. **Authentication**: All payment endpoints require authentication

## Payment Status Flow

```
PENDING
  ↓
PROCESSING (for certain payment methods)
  ↓
COMPLETED ← FAILED (with retry option)
  ↓
REFUNDED (optional)
```

## Testing

### Test Stripe Payments
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Test Mobile Money
Configure test API endpoints in `.env` for testing environment.

### Test Bank Transfers
Bank transfers in test mode will show pending status until manually confirmed via webhook.

## Troubleshooting

### Payment fails with "Stripe API key not configured"
- Check `.env` file has `STRIPE_SECRET_KEY`
- Restart the server after updating `.env`

### Webhook callbacks not received
- Verify webhook URL is publicly accessible
- Check firewall/network configuration
- Review provider's webhook logs

### Mobile Money payment times out
- Verify API endpoint URL is correct
- Check API key and business key
- Confirm phone number format (E.164)

## Production Checklist

- [ ] Update `.env` with production API keys
- [ ] Enable HTTPS
- [ ] Set up webhook endpoints for all payment providers
- [ ] Configure database backups
- [ ] Set up payment monitoring and alerts
- [ ] Test all payment methods thoroughly
- [ ] Implement rate limiting
- [ ] Set up logging and error tracking
- [ ] Review PCI compliance requirements
- [ ] Plan disaster recovery strategy

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review provider documentation
3. Contact support team

## Future Enhancements

- [ ] Payment plan/subscription support
- [ ] Invoice generation and sending
- [ ] Payment analytics dashboard
- [ ] Multi-currency support
- [ ] Wallet/prepaid account system
- [ ] Payment retry mechanism
- [ ] Advanced fraud detection