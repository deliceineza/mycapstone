import express from 'express';
import { Message, Conversation, Lease, Unit, Property, User, MaintenanceRequest } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { uuidParam } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import aiService from '../services/aiService.js';

const router = express.Router();

// Summarize a conversation
router.post('/conversations/:conversationId/summarize', authenticate, ...uuidParam('conversationId'), asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  if (conversation.landlordId !== req.userId && conversation.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const messages = await Message.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] }],
    order: [['createdAt', 'ASC']],
    limit: 50
  });

  const result = await aiService.summarizeConversation(messages);

  res.json({
    success: true,
    data: result
  });
}));

// Get reply suggestions for a conversation
router.get('/conversations/:conversationId/suggestions', authenticate, ...uuidParam('conversationId'), asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  if (conversation.landlordId !== req.userId && conversation.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const messages = await Message.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: User, as: 'sender', attributes: ['id', 'firstName'] }],
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  const result = await aiService.generateReplySuggestions(messages.reverse(), req.user.role);

  res.json({
    success: true,
    data: result
  });
}));

// Analyze maintenance request priority
router.post('/maintenance/analyze', authenticate, asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;

  if (!title || !description || !category) {
    throw new AppError('Title, description, and category are required', 400, 'MISSING_FIELDS');
  }

  const result = await aiService.analyzeMaintenanceUrgency(title, description, category);

  res.json({
    success: true,
    data: result
  });
}));

// Generate lease summary
router.get('/leases/:leaseId/summary', authenticate, ...uuidParam('leaseId'), asyncHandler(async (req, res) => {
  const lease = await Lease.findByPk(req.params.leaseId, {
    include: [
      { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] },
      { model: User, as: 'tenant', attributes: ['firstName', 'lastName'] }
    ]
  });

  if (!lease) {
    throw new AppError('Lease not found', 404, 'NOT_FOUND');
  }

  if (lease.landlordId !== req.userId && lease.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const leaseData = {
    propertyName: lease.unit.property.name,
    unitNumber: lease.unit.unitNumber,
    tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyRent: lease.monthlyRent,
    securityDeposit: lease.securityDeposit,
    paymentDueDay: lease.paymentDueDay,
    lateFeeAmount: lease.lateFeeAmount,
    lateFeeGracePeriod: lease.lateFeeGracePeriod
  };

  const result = await aiService.generateLeaseSummary(leaseData);

  res.json({
    success: true,
    data: result
  });
}));

// Generate payment reminder message
router.post('/payments/reminder-message', authenticate, asyncHandler(async (req, res) => {
  const { tenantName, amount, dueDate, propertyName } = req.body;

  if (!tenantName || !amount || !dueDate || !propertyName) {
    throw new AppError('All fields are required', 400, 'MISSING_FIELDS');
  }

  const result = await aiService.generatePaymentReminder(tenantName, amount, dueDate, propertyName);

  res.json({
    success: true,
    data: result
  });
}));

export default router;
