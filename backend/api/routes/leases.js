import express from 'express';
import { Lease, Unit, Property, User, Payment } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { leaseValidation, uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all leases (landlord sees all their leases, tenant sees their own)
router.get('/', authenticate, paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { status } = req.query;

  const whereClause = req.user.role === 'landlord' 
    ? { landlordId: req.userId }
    : { tenantId: req.userId };

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: leases } = await Lease.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address', 'city', 'state']
        }]
      },
      {
        model: User,
        as: 'tenant',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      },
      {
        model: User,
        as: 'landlord',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  res.json({
    success: true,
    data: {
      leases,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get single lease
router.get('/:id', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const lease = await Lease.findByPk(req.params.id, {
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{
          model: Property,
          as: 'property'
        }]
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
      },
      {
        model: Payment,
        as: 'payments',
        order: [['dueDate', 'DESC']],
        limit: 12
      }
    ]
  });

  if (!lease) {
    throw new AppError('Lease not found', 404, 'NOT_FOUND');
  }

  // Check access
  if (lease.landlordId !== req.userId && lease.tenantId !== req.userId) {
    throw new AppError('Not authorized to view this lease', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: { lease }
  });
}));

// Create lease (landlord only)
router.post('/', authenticate, authorize('landlord'), leaseValidation, asyncHandler(async (req, res) => {
  const { unitId, tenantId, startDate, endDate, monthlyRent, securityDeposit, 
          paymentDueDay, lateFeeAmount, lateFeeGracePeriod, terms, autoRenew } = req.body;

  // Verify unit belongs to landlord
  const unit = await Unit.findByPk(unitId, {
    include: [{
      model: Property,
      as: 'property',
      where: { landlordId: req.userId }
    }]
  });

  if (!unit) {
    throw new AppError('Unit not found or not owned by you', 404, 'NOT_FOUND');
  }

  // Verify tenant exists and is a tenant
  const tenant = await User.findOne({
    where: { id: tenantId, role: 'tenant', isActive: true }
  });

  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }

  // Check for existing active lease on unit
  const existingLease = await Lease.findOne({
    where: {
      unitId,
      status: 'active',
      endDate: { [Op.gte]: new Date() }
    }
  });

  if (existingLease) {
    throw new AppError('Unit already has an active lease', 400, 'ACTIVE_LEASE_EXISTS');
  }

  // Create lease
  const lease = await Lease.create({
    unitId,
    tenantId,
    landlordId: req.userId,
    startDate,
    endDate,
    monthlyRent,
    securityDeposit,
    paymentDueDay: paymentDueDay || 1,
    lateFeeAmount: lateFeeAmount || 0,
    lateFeeGracePeriod: lateFeeGracePeriod || 5,
    terms,
    autoRenew: autoRenew || false,
    status: new Date(startDate) <= new Date() ? 'active' : 'pending'
  });

  // Update unit status
  await unit.update({ status: 'occupied' });

  // Fetch full lease with relations
  const fullLease = await Lease.findByPk(lease.id, {
    include: [
      { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] },
      { model: User, as: 'tenant', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'landlord', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Lease created successfully',
    data: { lease: fullLease }
  });
}));

// Update lease
router.put('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({
    where: { id: req.params.id, landlordId: req.userId }
  });

  if (!lease) {
    throw new AppError('Lease not found', 404, 'NOT_FOUND');
  }

  const allowedUpdates = ['endDate', 'monthlyRent', 'paymentDueDay', 'lateFeeAmount', 
                          'lateFeeGracePeriod', 'terms', 'documents', 'autoRenew', 'status'];
  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  await lease.update(updates);

  // If lease is terminated, update unit status
  if (updates.status === 'terminated' || updates.status === 'expired') {
    const unit = await Unit.findByPk(lease.unitId);
    if (unit) {
      await unit.update({ status: 'vacant' });
    }
  }

  res.json({
    success: true,
    message: 'Lease updated successfully',
    data: { lease }
  });
}));

// Terminate lease
router.post('/:id/terminate', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({
    where: { id: req.params.id, landlordId: req.userId, status: 'active' }
  });

  if (!lease) {
    throw new AppError('Active lease not found', 404, 'NOT_FOUND');
  }

  await lease.update({ status: 'terminated' });

  // Update unit status
  const unit = await Unit.findByPk(lease.unitId);
  if (unit) {
    await unit.update({ status: 'vacant' });
  }

  res.json({
    success: true,
    message: 'Lease terminated successfully',
    data: { lease }
  });
}));

// Get tenant's current lease info (for tenant dashboard)
router.get('/tenant/current', authenticate, authorize('tenant'), asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({
    where: {
      tenantId: req.userId,
      status: 'active'
    },
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{
          model: Property,
          as: 'property'
        }]
      },
      {
        model: User,
        as: 'landlord',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage']
      },
      {
        model: Payment,
        as: 'payments',
        order: [['dueDate', 'DESC']],
        limit: 6
      }
    ]
  });

  res.json({
    success: true,
    data: { lease }
  });
}));

export default router;
