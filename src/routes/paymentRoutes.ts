import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { PaymentMethod, PaymentStatus } from '../types/payment';
import { authMiddleware } from '../middleware/auth';
import { validatePaymentRequest } from '../middleware/validators/paymentValidator';

const router = Router();

/**
 * POST /api/payment/charge
 * Process a payment for an event booking
 */
router.post('/charge', authMiddleware, validatePaymentRequest, async (req: Request, res: Response) => {
  try {
    const { eventId, amount, currency, paymentMethod, ticketQuantity, phoneNumber } = req.body;

    const paymentRequest = {
      eventId,
      userId: req.user.id,
      amount,
      currency,
      paymentMethod: paymentMethod as PaymentMethod,
      email: req.user.email,
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
router.get('/:transactionId', authMiddleware, async (req: Request, res: Response) => {
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

    // Check if user has access to this payment
    if (payment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access',
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
router.get('/event/:eventId', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/user/my-payments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payments = await PaymentService.getUserPayments(req.user.id);

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
router.post('/refund', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/event/:eventId/stats', authMiddleware, async (req: Request, res: Response) => {
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
