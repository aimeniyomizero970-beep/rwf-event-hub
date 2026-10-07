/**
 * Payment Service for TanStack Start
 * Handles Stripe payment processing
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CreateCheckoutSessionRequest {
  eventId: string;
  eventTitle: string;
  ticketTier: string;
  ticketPrice: number; // in RWF
  ticketQuantity: number;
  userEmail: string;
  userId: string;
  currency?: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Create a Stripe checkout session for event tickets
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: request.currency || 'rwf',
            product_data: {
              name: `${request.eventTitle} - ${request.ticketTier}`,
              description: `${request.ticketQuantity} ticket(s) for ${request.eventTitle}`,
              metadata: {
                eventId: request.eventId,
                ticketTier: request.ticketTier,
              },
            },
            unit_amount: Math.round(request.ticketPrice * 100), // Convert to cents
          },
          quantity: request.ticketQuantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.API_URL}/dashboard/customer?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${process.env.API_URL}/events?payment=cancelled`,
      customer_email: request.userEmail,
      metadata: {
        eventId: request.eventId,
        userId: request.userId,
        ticketTier: request.ticketTier,
        ticketQuantity: request.ticketQuantity.toString(),
      },
    });

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('Error retrieving session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve session',
    };
  }
}

/**
 * Handle webhook events from Stripe
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✓ Payment successful for event:', session.metadata?.eventId);
        // TODO: Update booking status in database
        break;

      case 'checkout.session.async_payment_failed':
        console.log('✗ Payment failed');
        // TODO: Handle payment failure
        break;

      case 'checkout.session.async_payment_succeeded':
        console.log('✓ Async payment succeeded');
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    };
  }
}
