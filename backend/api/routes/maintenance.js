import express from 'express';
import { MaintenanceRequest, Unit, Property, User, Notification } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { maintenanceValidation, uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all maintenance requests
router.get('/', authenticate, paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { status, priority, category } = req.query;

  const whereClause = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (category) whereClause.category = category;

  const { count, rows: requests } = await MaintenanceRequest.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'address'] }]
      },
      {
        model: User,
        as: 'tenant',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }
    ],
    order: [
      ['priority', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit,
    offset
  });

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get maintenance stats
router.get('/stats/summary', authenticate, asyncHandler(async (req, res) => {
  const whereClause = req.user.role === 'landlord'
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  const [pending, inProgress, completed, emergency] = await Promise.all([
    MaintenanceRequest.count({ where: { ...whereClause, status: 'pending' } }),
    MaintenanceRequest.count({ where: { ...whereClause, status: 'in_progress' } }),
    MaintenanceRequest.count({ where: { ...whereClause, status: 'completed' } }),
    MaintenanceRequest.count({ where: { ...whereClause, priority: 'emergency', status: { [Op.notIn]: ['completed', 'cancelled'] } } })
  ]);

  res.json({
    success: true,
    data: {
      pending,
      inProgress,
      completed,
      emergency
    }
  });
}));

// Get single maintenance request
router.get('/:id', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findByPk(req.params.id, {
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{ model: Property, as: 'property' }]
      },
      {
        model: User,
        as: 'tenant',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage']
      },
      {
        model: User,
        as: 'landlord',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage']
      }
    ]
  });

  if (!request) {
    throw new AppError('Maintenance request not found', 404, 'NOT_FOUND');
  }

  if (request.tenantId !== req.userId && request.landlordId !== req.userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: { request }
  });
}));

// Create maintenance request (tenant only)
router.post('/', authenticate, authorize('tenant'), maintenanceValidation, asyncHandler(async (req, res) => {
  const { unitId, title, description, category, priority, images } = req.body;

  // Find tenant's active lease to get unit and landlord
  const unit = await Unit.findByPk(unitId, {
    include: [{
      model: Property,
      as: 'property'
    }]
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  const request = await MaintenanceRequest.create({
    unitId,
    tenantId: req.userId,
    landlordId: unit.property.landlordId,
    title,
    description,
    category,
    priority: priority || 'medium',
    images: images || [],
    status: 'pending'
  });

  // Notify landlord
  await Notification.create({
    userId: unit.property.landlordId,
    type: 'maintenance_update',
    title: 'New Maintenance Request',
    body: `${req.user.firstName} submitted a ${priority || 'medium'} priority request: ${title}`,
    data: { requestId: request.id, unitId }
  });

  const fullRequest = await MaintenanceRequest.findByPk(request.id, {
    include: [
      { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] },
      { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName'] }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Maintenance request submitted',
    data: { request: fullRequest }
  });
}));

// Update maintenance request status (landlord)
router.put('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findOne({
    where: { id: req.params.id, landlordId: req.userId }
  });

  if (!request) {
    throw new AppError('Maintenance request not found', 404, 'NOT_FOUND');
  }

  const { status, notes, scheduledDate, cost, vendorInfo, priority } = req.body;

  const updates = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (scheduledDate) updates.scheduledDate = scheduledDate;
  if (cost !== undefined) updates.cost = cost;
  if (vendorInfo) updates.vendorInfo = vendorInfo;
  if (priority) updates.priority = priority;

  if (status === 'completed') {
    updates.completedAt = new Date();
  }

  await request.update(updates);

  // Notify tenant
  await Notification.create({
    userId: request.tenantId,
    type: 'maintenance_update',
    title: 'Maintenance Update',
    body: `Your maintenance request "${request.title}" has been updated to: ${status || request.status}`,
    data: { requestId: request.id }
  });

  res.json({
    success: true,
    message: 'Maintenance request updated',
    data: { request }
  });
}));

// Cancel maintenance request (tenant only for pending)
router.post('/:id/cancel', authenticate, authorize('tenant'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findOne({
    where: { id: req.params.id, tenantId: req.userId, status: 'pending' }
  });

  if (!request) {
    throw new AppError('Maintenance request not found or cannot be cancelled', 404, 'NOT_FOUND');
  }

  await request.update({ status: 'cancelled' });

  res.json({
    success: true,
    message: 'Maintenance request cancelled'
  });
}));

export default router;
