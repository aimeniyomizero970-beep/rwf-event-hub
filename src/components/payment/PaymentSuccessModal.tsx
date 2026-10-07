/**
 * Payment Success Modal Component
 * Shows after successful payment
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';

export function PaymentSuccessModal() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/dashboard/customer' });
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = (searchParams as any)?.session_id;
    const paymentParam = (searchParams as any)?.payment;

    if (sessionId && paymentParam === 'success') {
      setIsOpen(true);
      verifyPayment(sessionId);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/payment/session?id=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setPaymentStatus(data.paymentStatus);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    navigate({ to: '/dashboard/customer' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Status</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-6">
          {isVerifying ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-center text-sm text-gray-600">Verifying payment...</p>
            </>
          ) : paymentStatus === 'paid' ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h2 className="font-semibold text-green-700">Payment Successful!</h2>
                <p className="text-sm text-gray-600">Your tickets have been issued.</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="font-semibold text-gray-700">Payment Pending</h2>
                <p className="text-sm text-gray-600">Your payment is being processed.</p>
              </div>
            </>
          )}
        </div>

        <Button onClick={handleClose} className="w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
