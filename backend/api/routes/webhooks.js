import express from 'express';
import Stripe from 'stripe';
import { Payment, Notification } from '../models/index.js';

const router = express.Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe webhook handler
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.metadata.paymentId;

      if (paymentId) {
        const payment = await Payment.findByPk(paymentId);
        if (payment) {
          await payment.update({
            status: 'completed',
            paidAt: new Date(),
            stripeChargeId: paymentIntent.latest_charge,
            paymentMethod: 'card'
          });

          // Notify landlord
          await Notification.create({
            userId: payment.landlordId,
            type: 'payment_received',
            title: 'Payment Received',
            body: `Payment of $${payment.totalAmount} has been received`,
            data: { paymentId: payment.id }
          });

          // Notify tenant
          await Notification.create({
            userId: payment.tenantId,
            type: 'payment_received',
            title: 'Payment Successful',
            body: `Your payment of $${payment.totalAmount} was successful`,
            data: { paymentId: payment.id }
          });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.metadata.paymentId;

      if (paymentId) {
        const payment = await Payment.findByPk(paymentId);
        if (payment) {
          await payment.update({
            status: 'failed',
            metadata: {
              ...payment.metadata,
              failureReason: paymentIntent.last_payment_error?.message
            }
          });

          // Notify tenant
          await Notification.create({
            userId: payment.tenantId,
            type: 'payment_reminder',
            title: 'Payment Failed',
            body: `Your payment of $${payment.totalAmount} failed. Please try again.`,
            data: { paymentId: payment.id }
          });
        }
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      
      // Find payment by Stripe charge ID
      const payment = await Payment.findOne({
        where: { stripeChargeId: charge.id }
      });

      if (payment) {
        await payment.update({ status: 'refunded' });

        // Notify both parties
        await Promise.all([
          Notification.create({
            userId: payment.tenantId,
            type: 'payment_received',
            title: 'Payment Refunded',
            body: `Your payment of $${payment.totalAmount} has been refunded`,
            data: { paymentId: payment.id }
          }),
          Notification.create({
            userId: payment.landlordId,
            type: 'payment_received',
            title: 'Payment Refunded',
            body: `Payment of $${payment.totalAmount} has been refunded to tenant`,
            data: { paymentId: payment.id }
          })
        ]);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
