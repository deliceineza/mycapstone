import express from 'express';
import { Conversation, Message, User, Property, Notification } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { messageValidation, uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all conversations
router.get('/conversations', authenticate, paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const whereClause = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  const { count, rows: conversations } = await Conversation.findAndCountAll({
    where: {
      ...whereClause,
      isArchived: false
    },
    include: [
      {
        model: User,
        as: 'landlord',
        attributes: ['id', 'firstName', 'lastName', 'profileImage']
      },
      {
        model: User,
        as: 'tenant',
        attributes: ['id', 'firstName', 'lastName', 'profileImage']
      },
      {
        model: Property,
        as: 'property',
        attributes: ['id', 'name', 'address'],
        required: false
      }
    ],
    order: [['lastMessageAt', 'DESC']],
    limit,
    offset
  });

  // Get unread counts
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.count({
        where: {
          conversationId: conv.id,
          senderId: { [Op.ne]: req.userId },
          isRead: false
        }
      });
      return {
        ...conv.toJSON(),
        unreadCount
      };
    })
  );

  res.json({
    success: true,
    data: {
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get or create conversation
router.post('/conversations', authenticate, asyncHandler(async (req, res) => {
  const { recipientId, propertyId, subject } = req.body;

  if (!recipientId) {
    throw new AppError('Recipient ID is required', 400, 'MISSING_RECIPIENT');
  }

  const recipient = await User.findByPk(recipientId);
  if (!recipient) {
    throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
  }

  // Determine landlord and tenant based on roles
  let landlordId, tenantId;
  if (req.user.role === 'landlord') {
    landlordId = req.userId;
    tenantId = recipientId;
  } else {
    landlordId = recipientId;
    tenantId = req.userId;
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    where: { landlordId, tenantId, propertyId: propertyId || null }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      landlordId,
      tenantId,
      propertyId: propertyId || null,
      subject: subject || null
    });
  }

  // Fetch with relations
  conversation = await Conversation.findByPk(conversation.id, {
    include: [
      { model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'profileImage'] },
      { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'profileImage'] },
      { model: Property, as: 'property', attributes: ['id', 'name'], required: false }
    ]
  });

  res.status(201).json({
    success: true,
    data: { conversation }
  });
}));

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticate, ...uuidParam('conversationId'), paginationQuery, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  // Check access
  if (conversation.landlordId !== req.userId && conversation.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const { count, rows: messages } = await Message.findAndCountAll({
    where: { conversationId: req.params.conversationId },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'profileImage']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  // Mark messages as read
  await Message.update(
    { isRead: true, readAt: new Date() },
    {
      where: {
        conversationId: req.params.conversationId,
        senderId: { [Op.ne]: req.userId },
        isRead: false
      }
    }
  );

  res.json({
    success: true,
    data: {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Send message
router.post('/conversations/:conversationId/messages', authenticate, ...uuidParam('conversationId'), messageValidation, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  // Check access
  if (conversation.landlordId !== req.userId && conversation.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  const { content, messageType, attachments } = req.body;

  const message = await Message.create({
    conversationId: conversation.id,
    senderId: req.userId,
    content,
    messageType: messageType || 'text',
    attachments: attachments || []
  });

  // Update conversation
  await conversation.update({
    lastMessageAt: new Date(),
    lastMessagePreview: content.substring(0, 100)
  });

  // Fetch with sender info
  const fullMessage = await Message.findByPk(message.id, {
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'firstName', 'lastName', 'profileImage']
    }]
  });

  // Notify recipient
  const recipientId = conversation.landlordId === req.userId 
    ? conversation.tenantId 
    : conversation.landlordId;

  await Notification.create({
    userId: recipientId,
    type: 'new_message',
    title: 'New Message',
    body: `${req.user.firstName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
    data: { conversationId: conversation.id, messageId: message.id }
  });

  res.status(201).json({
    success: true,
    data: { message: fullMessage }
  });
}));

// Archive conversation
router.put('/conversations/:conversationId/archive', authenticate, ...uuidParam('conversationId'), asyncHandler(async (req, res) => {
  const conversation = await Conversation.findByPk(req.params.conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  if (conversation.landlordId !== req.userId && conversation.tenantId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  await conversation.update({ isArchived: true });

  res.json({
    success: true,
    message: 'Conversation archived'
  });
}));

// Get unread message count
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const conversationWhere = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  const conversations = await Conversation.findAll({
    where: conversationWhere,
    attributes: ['id']
  });

  const conversationIds = conversations.map(c => c.id);

  const unreadCount = await Message.count({
    where: {
      conversationId: { [Op.in]: conversationIds },
      senderId: { [Op.ne]: req.userId },
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { unreadCount }
  });
}));

export default router;
