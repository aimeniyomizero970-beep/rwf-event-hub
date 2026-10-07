/**
 * API Route: POST /api/payment/checkout
 * Creates a Stripe checkout session for event tickets
 */

import { json, type APIEvent } from '@tanstack/start';
import { createCheckoutSession } from '~/server/payment';

export async function POST({ request }: APIEvent) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { eventId, eventTitle, ticketTier, ticketPrice, ticketQuantity, userEmail, userId } =
      body;

    if (!eventId || !eventTitle || !ticketTier || !ticketPrice || !ticketQuantity || !userEmail) {
      return json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Validate amounts
    if (ticketPrice <= 0 || ticketQuantity <= 0) {
      return json(
        {
          success: false,
          error: 'Invalid price or quantity',
        },
        { status: 400 }
      );
    }

    const result = await createCheckoutSession({
      eventId,
      eventTitle,
      ticketTier,
      ticketPrice,
      ticketQuantity,
      userEmail,
      userId,
      currency: 'rwf',
    });

    if (!result.success) {
      return json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return json({
      success: true,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
