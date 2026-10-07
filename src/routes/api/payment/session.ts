/**
 * API Route: GET /api/payment/session?id=CHECKOUT_SESSION_ID
 * Retrieves payment status from Stripe checkout session
 */

import { json, type APIEvent } from '@tanstack/start';
import { getCheckoutSession } from '~/server/payment';

export async function GET({ request }: APIEvent) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return json(
        {
          success: false,
          error: 'Missing session ID',
        },
        { status: 400 }
      );
    }

    const result = await getCheckoutSession(sessionId);

    if (!result.success) {
      return json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    const session = result.session as any;

    return json({
      success: true,
      paymentStatus: session.payment_status,
      paymentIntent: session.payment_intent,
      customerId: session.customer,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Session API error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
