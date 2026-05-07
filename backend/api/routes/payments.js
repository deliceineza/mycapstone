import express from 'express';
import Stripe from 'stripe';
import { Payment, Lease, User, Unit, Property, Notification } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { paymentValidation, uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Initialize Stripe (will be null if no key provided)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

// Get all payments
router.get('/', authenticate, paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { status, leaseId } = req.query;

  const whereClause = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  if (status) whereClause.status = status;
  if (leaseId) whereClause.leaseId = leaseId;

  const { count, rows: payments } = await Payment.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Lease,
        as: 'lease',
        include: [{
          model: Unit,
          as: 'unit',
          include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'address'] }]
        }]
      },
      {
        model: User,
        as: 'tenant',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    ],
    order: [['dueDate', 'DESC']],
    limit,
    offset
  });

  res.json({
    success: true,
    data: {
      payments,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get payment by ID
router.get('/:id', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const payment = await Payment.findByPk(req.params.id, {
    include: [
      {
        model: Lease,
        as: 'lease',
        include: [
          { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] }
        ]
      },
      { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ]
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.tenantId !== req.userId && payment.landlordId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: { payment }
  });
}));

// Create payment record (landlord generates payment request)
router.post('/', authenticate, authorize('landlord'), paymentValidation, asyncHandler(async (req, res) => {
  const { leaseId, amount, dueDate, paymentType, notes } = req.body;

  const lease = await Lease.findOne({
    where: { id: leaseId, landlordId: req.userId, status: 'active' }
  });

  if (!lease) {
    throw new AppError('Lease not found', 404, 'NOT_FOUND');
  }

  // Calculate late fee if applicable
  let lateFee = 0;
  const dueDateObj = new Date(dueDate);
  const today = new Date();
  if (today > dueDateObj) {
    const daysLate = Math.floor((today - dueDateObj) / (1000 * 60 * 60 * 24));
    if (daysLate > lease.lateFeeGracePeriod) {
      lateFee = parseFloat(lease.lateFeeAmount);
    }
  }

  const payment = await Payment.create({
    leaseId,
    tenantId: lease.tenantId,
    landlordId: req.userId,
    amount,
    lateFee,
    totalAmount: parseFloat(amount) + lateFee,
    dueDate,
    paymentType: paymentType || 'rent',
    notes,
    status: 'pending'
  });

  // Create notification for tenant
  await Notification.create({
    userId: lease.tenantId,
    type: 'payment_reminder',
    title: 'New Payment Due',
    body: `A payment of $${payment.totalAmount} is due on ${dueDate}`,
    data: { paymentId: payment.id, leaseId }
  });

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: { payment }
  });
}));

// Create Stripe payment intent (tenant initiates payment)
router.post('/:id/pay', authenticate, authorize('tenant'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  if (!stripe) {
    throw new AppError('Payment processing not configured', 503, 'STRIPE_NOT_CONFIGURED');
  }

  const payment = await Payment.findOne({
    where: { id: req.params.id, tenantId: req.userId, status: 'pending' }
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(payment.totalAmount * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      paymentId: payment.id,
      tenantId: req.userId,
      leaseId: payment.leaseId
    }
  });

  await payment.update({
    stripePaymentIntentId: paymentIntent.id,
    status: 'processing'
  });

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  });
}));

// Confirm payment (webhook or manual confirmation)
router.post('/:id/confirm', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const payment = await Payment.findByPk(req.params.id);

  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.tenantId !== req.userId && payment.landlordId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const { paymentMethod, stripeChargeId, receiptUrl } = req.body;

  await payment.update({
    status: 'completed',
    paidAt: new Date(),
    paymentMethod: paymentMethod || 'card',
    stripeChargeId,
    receiptUrl
  });

  // Notify landlord
  await Notification.create({
    userId: payment.landlordId,
    type: 'payment_received',
    title: 'Payment Received',
    body: `Payment of $${payment.totalAmount} has been received`,
    data: { paymentId: payment.id }
  });

  res.json({
    success: true,
    message: 'Payment confirmed',
    data: { payment }
  });
}));

// Record manual payment (landlord records cash/check payment)
router.post('/:id/record-manual', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    where: { id: req.params.id, landlordId: req.userId }
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  const { paymentMethod, notes } = req.body;

  await payment.update({
    status: 'completed',
    paidAt: new Date(),
    paymentMethod: paymentMethod || 'cash',
    notes: notes || payment.notes
  });

  // Notify tenant
  await Notification.create({
    userId: payment.tenantId,
    type: 'payment_received',
    title: 'Payment Recorded',
    body: `Your payment of $${payment.totalAmount} has been recorded`,
    data: { paymentId: payment.id }
  });

  res.json({
    success: true,
    message: 'Payment recorded successfully',
    data: { payment }
  });
}));

// Get payment summary/stats
router.get('/stats/summary', authenticate, asyncHandler(async (req, res) => {
  const whereClause = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const [totalPending, totalCompleted, monthlyTotal, overduePayments] = await Promise.all([
    Payment.sum('totalAmount', {
      where: { ...whereClause, status: 'pending' }
    }),
    Payment.sum('totalAmount', {
      where: { ...whereClause, status: 'completed' }
    }),
    Payment.sum('totalAmount', {
      where: {
        ...whereClause,
        status: 'completed',
        paidAt: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    }),
    Payment.count({
      where: {
        ...whereClause,
        status: 'pending',
        dueDate: { [Op.lt]: new Date() }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      totalPending: totalPending || 0,
      totalCompleted: totalCompleted || 0,
      monthlyTotal: monthlyTotal || 0,
      overduePayments
    }
  });
}));

// Generate monthly rent payments (called by cron or manually)
router.post('/generate-monthly', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const leases = await Lease.findAll({
    where: { landlordId: req.userId, status: 'active' }
  });

  const currentDate = new Date();
  const payments = [];

  for (const lease of leases) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), lease.paymentDueDay);
    
    // Check if payment already exists for this month
    const existingPayment = await Payment.findOne({
      where: {
        leaseId: lease.id,
        paymentType: 'rent',
        dueDate: {
          [Op.between]: [
            new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
            new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          ]
        }
      }
    });

    if (!existingPayment) {
      const payment = await Payment.create({
        leaseId: lease.id,
        tenantId: lease.tenantId,
        landlordId: lease.landlordId,
        amount: lease.monthlyRent,
        lateFee: 0,
        totalAmount: lease.monthlyRent,
        dueDate,
        paymentType: 'rent',
        status: 'pending'
      });
      payments.push(payment);

      // Notify tenant
      await Notification.create({
        userId: lease.tenantId,
        type: 'payment_reminder',
        title: 'Rent Due',
        body: `Your rent payment of $${lease.monthlyRent} is due on ${dueDate.toLocaleDateString()}`,
        data: { paymentId: payment.id, leaseId: lease.id }
      });
    }
  }

  res.json({
    success: true,
    message: `Generated ${payments.length} payment records`,
    data: { count: payments.length }
  });
}));

export default router;
