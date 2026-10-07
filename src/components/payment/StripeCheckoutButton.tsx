/**
 * Stripe Checkout Button Component
 * Initiates secure payment for event tickets
 */

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface StripeCheckoutButtonProps {
  eventId: string;
  eventTitle: string;
  ticketTier: string;
  ticketPrice: number; // in RWF
  ticketQuantity: number;
  userEmail: string;
  userId: string;
  className?: string;
  children?: React.ReactNode;
}

export function StripeCheckoutButton({
  eventId,
  eventTitle,
  ticketTier,
  ticketPrice,
  ticketQuantity,
  userEmail,
  userId,
  className,
  children,
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (!userEmail) {
      toast.error('Please log in to purchase tickets');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          eventTitle,
          ticketTier,
          ticketPrice,
          ticketQuantity,
          userEmail,
          userId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to create checkout session');
        return;
      }

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An error occurred during checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {children || `Pay ${(ticketPrice * ticketQuantity).toLocaleString('en-RW')} RWF`}
        </>
      )}
    </Button>
  );
}
