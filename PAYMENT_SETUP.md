# Stripe Payment Integration Guide

## Overview

This guide explains how to set up and use the Stripe payment system in your event management platform.

## Quick Setup

### 1. Get Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_test_`)
3. Copy your **Publishable Key** (starts with `pk_test_`)

### 2. Configure Environment

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` and add your keys:

```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
API_URL=http://localhost:5173
```

### 3. Install Dependencies

```bash
npm install stripe
```

### 4. Run Development Server

```bash
npm run dev
```

## Payment Flow

### 1. User Selects Tickets

- User chooses event, ticket tier, and quantity
- Shows total price in RWF

### 2. Click "Pay Now"

- Frontend calls `/api/payment/checkout`
- Backend creates Stripe checkout session
- User redirected to Stripe Checkout

### 3. Stripe Checkout

- User enters card details (test or real)
- Stripe processes payment securely
- Redirects back to app on success/cancel

### 4. Webhook Confirmation

- Stripe sends webhook to `/api/payment/webhook`
- Payment status updated in database
- User receives confirmation

## API Endpoints

### Create Checkout Session

```
POST /api/payment/checkout

Body:
{
  "eventId": "event-123",
  "eventTitle": "Tech Conference 2024",
  "ticketTier": "VIP",
  "ticketPrice": 50000,
  "ticketQuantity": 2,
  "userEmail": "user@example.com",
  "userId": "user-123"
}

Response:
{
  "success": true,
  "sessionId": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### Get Payment Session Status

```
GET /api/payment/session?id=cs_test_...

Response:
{
  "success": true,
  "paymentStatus": "paid",
  "paymentIntent": "pi_test_...",
  "metadata": { ... }
}
```

### Webhook

```
POST /api/payment/webhook

Stripe will send this automatically.
No body needed from frontend.
```

## Testing with Stripe Test Cards

### Successful Payment

- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)

### Declined Payment

- **Card Number**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

### 3D Secure (Requires Authentication)

- **Card Number**: `4000 0025 0000 3155`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **Authentication**: Complete the 3D Secure modal

## Component Usage

### StripeCheckoutButton

```tsx
import { StripeCheckoutButton } from '~/components/payment/StripeCheckoutButton';

function EventDetails() {
  return (
    <StripeCheckoutButton
      eventId="event-123"
      eventTitle="Tech Conference"
      ticketTier="VIP"
      ticketPrice={50000}
      ticketQuantity={2}
      userEmail="user@example.com"
      userId="user-123"
    >
      Buy VIP Ticket - 100,000 RWF
    </StripeCheckoutButton>
  );
}
```

### PaymentSuccessModal

Automatically shows after successful payment redirect.

```tsx
import { PaymentSuccessModal } from '~/components/payment/PaymentSuccessModal';

function Dashboard() {
  return (
    <div>
      <PaymentSuccessModal />
      {/* other dashboard content */}
    </div>
  );
}
```

## Webhook Setup (Production)

### Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/payment/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_failed`
   - `checkout.session.async_payment_succeeded`
5. Copy the **Signing Secret** (starts with `whsec_`)
6. Add to your production `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
   ```

### Test Webhook (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5173/api/payment/webhook

# Get your webhook signing secret
stripe listen

# Trigger a test event
stripe trigger checkout.session.completed
```

## Database Integration

After implementing database models, update the webhook handler in `src/server/payment.ts`:

```typescript
case 'checkout.session.completed':
  const session = event.data.object as Stripe.Checkout.Session;
  
  // Update booking status
  await db.booking.update({
    where: { stripeSessionId: session.id },
    data: {
      status: 'confirmed',
      paymentIntentId: session.payment_intent as string,
    },
  });
  
  // Issue digital tickets
  await issueDigitalTickets(session.metadata);
  
  // Send confirmation email
  await sendBookingConfirmation(session.customer_email);
  break;
```

## Security Best Practices

1. **Never commit `.env`** - Always use `.env.local` or `.env.example`
2. **Use HTTPS** - Required in production
3. **Validate amounts** - Always verify prices on the server
4. **Verify webhooks** - Stripe CLI or production webhook signature
5. **Handle errors** - Gracefully handle payment failures
6. **Rate limit** - Prevent abuse of payment endpoints
7. **Log transactions** - Keep audit trail for compliance
8. **PCI compliance** - Never store full card numbers

## Troubleshooting

### "Stripe API key not configured"

- Check `.env.local` has `STRIPE_SECRET_KEY`
- Restart dev server after updating `.env`
- Verify key format starts with `sk_test_` or `sk_live_`

### "Webhook signature verification failed"

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Use `stripe listen` for local testing
- Check webhook endpoint in Stripe dashboard

### "Checkout session not found"

- Verify session ID format (starts with `cs_`)
- Check session isn't too old (expires after 24 hours)
- Ensure correct Stripe key is being used

## Production Deployment

### Before Going Live

1. Update Stripe keys to **live keys** (`sk_live_`, `pk_live_`)
2. Test with real card (small amount first)
3. Set up production webhook in Stripe dashboard
4. Enable 3D Secure for card security
5. Configure SSL/HTTPS
6. Set up email notifications
7. Implement database transaction logging
8. Monitor payment errors and webhook failures

### Stripe Dashboard Features

- View all payments: https://dashboard.stripe.com/payments
- Check webhooks: https://dashboard.stripe.com/webhooks
- Download reports: https://dashboard.stripe.com/reports
- Test mode vs Live mode toggle in top right

## Next Steps

1. ✓ Stripe checkout integration complete
2. Add database models for bookings and payments
3. Implement digital ticket generation
4. Add email notifications
5. Create admin payment reports
6. Set up payment analytics

## Support

- Stripe Docs: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Contact Support: https://support.stripe.com
