/**
 * API Route: POST /api/payment/webhook
 * Handles Stripe webhook events
 */

import { json, type APIEvent } from '@tanstack/start';
import { handleStripeWebhook } from '~/server/payment';

export async function POST({ request }: APIEvent) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return json(
        {
          error: 'Missing stripe-signature header',
        },
        { status: 400 }
      );
    }

    const body = await request.text();
    const result = await handleStripeWebhook(body, signature);

    if (!result.success) {
      return json(
        {
          error: result.error,
        },
        { status: 400 }
      );
    }

    return json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}
