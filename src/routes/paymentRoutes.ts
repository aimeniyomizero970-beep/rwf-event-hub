import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { PaymentMethod, PaymentStatus } from '../types/payment';
import { validatePaymentRequest } from '../middleware/validators/paymentValidator';

const router = Router();

/**
 * POST /api/payment/charge
 * Process a payment for an event booking
 */
router.post('/charge', validatePaymentRequest, async (req: Request, res: Response) => {
  try {
    const { eventId, amount, currency, paymentMethod, ticketQuantity, phoneNumber } = req.body;
    const userId = (req as any).user?.id || req.body.userId;
    const email = (req as any).user?.email || req.body.email;

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const paymentRequest = {
      eventId,
      userId,
      amount,
      currency,
      paymentMethod: paymentMethod as PaymentMethod,
      email,
      phoneNumber,
      ticketQuantity,
    };

    const paymentResponse = await PaymentService.processPayment(paymentRequest);

    if (paymentResponse.status === PaymentStatus.COMPLETED) {
      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: paymentResponse,
      });
    } else if (paymentResponse.redirectUrl) {
      res.status(200).json({
        success: true,
        message: 'Payment initiated, redirect to complete',
        data: paymentResponse,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: paymentResponse.error,
      });
    }
  } catch (error) {
    console.error('Payment charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/payment/:transactionId
 * Get payment details by transaction ID
 */
router.get('/:transactionId', async (req: Request, res: Response) => {
  try {
    const payment = await PaymentService.getPaymentByTransactionId(
      req.params.transactionId
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/payment/event/:eventId
 * Get all payments for an event
 */
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const payments = await PaymentService.getEventPayments(
      req.params.eventId,
      status as PaymentStatus | undefined
    );

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Get event payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/payment/user/my-payments
 * Get all payments by current user
 */
router.get('/user/my-payments', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const payments = await PaymentService.getUserPayments(userId as string);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/payment/refund
 * Process a refund for a payment
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { transactionId, reason, amount } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and reason are required',
      });
    }

    const refundResponse = await PaymentService.processRefund({
      transactionId,
      reason,
      amount,
    });

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refundResponse,
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/payment/event/:eventId/stats
 * Get payment statistics for an event
 */
router.get('/event/:eventId/stats', async (req: Request, res: Response) => {
  try {
    const stats = await PaymentService.getEventPaymentStats(req.params.eventId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/payment/webhook/stripe
 * Handle Stripe webhook callbacks
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const { object } = data;

    // Update payment status based on webhook
    if (object.metadata?.transactionId) {
      let status = PaymentStatus.PENDING;
      
      switch (req.body.type) {
        case 'payment_intent.succeeded':
          status = PaymentStatus.COMPLETED;
          break;
        case 'payment_intent.payment_failed':
          status = PaymentStatus.FAILED;
          break;
        case 'charge.refunded':
          status = PaymentStatus.REFUNDED;
          break;
      }

      await PaymentService.updatePaymentStatus(
        object.metadata.transactionId,
        status
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/payment/webhook/mobile-money
 * Handle Mobile Money webhook callbacks
 */
router.post('/webhook/mobile-money', async (req: Request, res: Response) => {
  try {
    const { externalId, status } = req.body;

    if (externalId) {
      const paymentStatus =
        status === 'SUCCESSFUL' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

      await PaymentService.updatePaymentStatus(externalId, paymentStatus);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/payment/webhook/bank
 * Handle Bank Transfer webhook callbacks
 */
router.post('/webhook/bank', async (req: Request, res: Response) => {
  try {
    const { reference, status } = req.body;

    if (reference) {
      // Extract transaction ID from reference (RWF-{transactionId})
      const transactionId = reference.replace('RWF-', '');
      const paymentStatus =
        status === 'COMPLETED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;

      await PaymentService.updatePaymentStatus(transactionId, paymentStatus);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;