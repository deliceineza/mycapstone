import express from 'express';
import { Notification, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Create notification
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, body, type, data, scheduledFor } = req.body;

  if (!title || !body || !type) {
    throw new AppError('Title, body, and type are required', 400, 'MISSING_FIELDS');
  }

  const allowedTypes = [
    'payment_reminder', 'payment_received', 'payment_overdue', 'lease_expiring',
    'new_message', 'maintenance_update', 'announcement', 'system'
  ];

  if (!allowedTypes.includes(type)) {
    throw new AppError('Invalid notification type', 400, 'INVALID_TYPE');
  }

  const notification = await Notification.create({
    userId: req.userId,
    title,
    body,
    type,
    data: data || {},
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null
  });

  res.status(201).json({
    success: true,
    data: { notification }
  });
}));

// Get all notifications
router.get('/', authenticate, paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { unreadOnly } = req.query;

  const whereClause = { userId: req.userId };
  if (unreadOnly === 'true') {
    whereClause.isRead = false;
  }

  const { count, rows: notifications } = await Notification.findAndCountAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  const unreadCount = await Notification.count({
    where: { userId: req.userId, isRead: false }
  });

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Mark notification as read
router.put('/:id/read', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    where: { id: req.params.id, userId: req.userId }
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }

  await notification.update({
    isRead: true,
    readAt: new Date()
  });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// Mark all notifications as read
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId: req.userId, isRead: false } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// Delete notification
router.delete('/:id', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    where: { id: req.params.id, userId: req.userId }
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }

  await notification.destroy();

  res.json({
    success: true,
    message: 'Notification deleted'
  });
}));

// Clear all notifications
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  await Notification.destroy({
    where: { userId: req.userId }
  });

  res.json({
    success: true,
    message: 'All notifications cleared'
  });
}));

// Get unread count only
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const unreadCount = await Notification.count({
    where: { userId: req.userId, isRead: false }
  });

  res.json({
    success: true,
    data: { unreadCount }
  });
}));

// Update notification preferences
router.put('/preferences', authenticate, asyncHandler(async (req, res) => {
  const { email, push, sms } = req.body;

  const preferences = {
    email: email !== undefined ? email : req.user.notificationPreferences.email,
    push: push !== undefined ? push : req.user.notificationPreferences.push,
    sms: sms !== undefined ? sms : req.user.notificationPreferences.sms
  };

  await req.user.update({ notificationPreferences: preferences });

  res.json({
    success: true,
    message: 'Notification preferences updated',
    data: { preferences }
  });
}));

export default router;
