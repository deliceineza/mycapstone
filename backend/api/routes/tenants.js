import express from 'express';
import { User, Lease, Payment, Property, Unit } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all tenants for a landlord
router.get('/', authenticate, authorize('landlord'), paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { search, status } = req.query;

  // Get tenant IDs from leases owned by this landlord
  const leaseWhere = { landlordId: req.userId };
  if (status) {
    leaseWhere.status = status;
  }

  const leases = await Lease.findAll({
    where: leaseWhere,
    attributes: ['tenantId'],
    group: ['tenantId']
  });

  const tenantIds = leases.map(l => l.tenantId);

  if (tenantIds.length === 0) {
    return res.json({
      success: true,
      data: {
        tenants: [],
        pagination: { page, limit, total: 0, pages: 0 }
      }
    });
  }

  const userWhere = { id: { [Op.in]: tenantIds } };
  if (search) {
    userWhere[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows: tenants } = await User.findAndCountAll({
    where: userWhere,
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Lease,
        as: 'tenantLeases',
        where: { landlordId: req.userId },
        required: false,
        include: [
          {
            model: Unit,
            as: 'unit',
            include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'address'] }]
          }
        ]
      }
    ],
    limit,
    offset,
    distinct: true
  });

  res.json({
    success: true,
    data: {
      tenants,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get single tenant details
router.get('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  // Verify tenant has a lease with this landlord
  const lease = await Lease.findOne({
    where: { tenantId: req.params.id, landlordId: req.userId }
  });

  if (!lease) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  const tenant = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Lease,
        as: 'tenantLeases',
        where: { landlordId: req.userId },
        include: [
          {
            model: Unit,
            as: 'unit',
            include: [{ model: Property, as: 'property' }]
          },
          {
            model: Payment,
            as: 'payments',
            order: [['dueDate', 'DESC']],
            limit: 12
          }
        ]
      }
    ]
  });

  res.json({
    success: true,
    data: { tenant }
  });
}));

// Invite tenant (send invitation to create account)
router.post('/invite', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const { email, firstName, lastName, unitId } = req.body;

  if (!email || !firstName || !lastName) {
    throw new AppError('Email, first name, and last name are required', 400, 'MISSING_FIELDS');
  }

  // Check if user already exists
  let tenant = await User.findOne({ where: { email } });

  if (tenant && tenant.role !== 'tenant') {
    throw new AppError('This email is already registered as a landlord', 400, 'INVALID_ROLE');
  }

  if (!tenant) {
    // Create tenant account with temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    tenant = await User.create({
      email,
      firstName,
      lastName,
      password: tempPassword,
      role: 'tenant',
      isActive: true
    });
  }

  // If unitId provided, verify it belongs to landlord
  if (unitId) {
    const unit = await Unit.findByPk(unitId, {
      include: [{
        model: Property,
        as: 'property',
        where: { landlordId: req.userId }
      }]
    });

    if (!unit) {
      throw new AppError('Unit not found', 404, 'UNIT_NOT_FOUND');
    }
  }

  // In production, send invitation email here
  // await sendInvitationEmail(tenant, req.user);

  res.status(201).json({
    success: true,
    message: 'Tenant invitation sent',
    data: {
      tenant: {
        id: tenant.id,
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName
      }
    }
  });
}));

// Create tenant directly
router.post('/', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const { email, firstName, lastName, phone, password } = req.body;
  const tenantPassword = password || 'password123!';

  if (!email || !firstName || !lastName) {
    throw new AppError('Email, first name, and last name are required', 400, 'MISSING_FIELDS');
  }

  // Prevent duplicate tenant accounts by email or phone
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [
        { email },
        { phone }
      ]
    }
  });

  if (existingUser) {
    throw new AppError('A tenant with this email or phone already exists', 400, 'USER_EXISTS');
  }

  // Create tenant account with default password
  const tenant = await User.create({
    email,
    firstName,
    lastName,
    phone,
    password: tenantPassword,
    role: 'tenant',
    isActive: true,
    mustChangePassword: true
  });

  res.status(201).json({
    success: true,
    message: 'Tenant created successfully',
    data: {
      tenant: {
        id: tenant.id,
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone,
        role: tenant.role,
        isActive: tenant.isActive,
        password: tenantPassword
      }
    }
  });
}));

// Get tenant payment history
router.get('/:id/payments', authenticate, authorize('landlord'), ...uuidParam('id'), paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Verify tenant has lease with landlord
  const lease = await Lease.findOne({
    where: { tenantId: req.params.id, landlordId: req.userId }
  });

  if (!lease) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  const { count, rows: payments } = await Payment.findAndCountAll({
    where: { tenantId: req.params.id, landlordId: req.userId },
    include: [
      {
        model: Lease,
        as: 'lease',
        include: [{
          model: Unit,
          as: 'unit',
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }]
        }]
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

// Update tenant
router.put('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, isActive } = req.body;

  // Verify tenant exists and has a lease with this landlord
  const lease = await Lease.findOne({
    where: { tenantId: req.params.id, landlordId: req.userId }
  });

  if (!lease) {
    throw new AppError('Tenant not found or not associated with your properties', 404, 'NOT_FOUND');
  }

  const tenant = await User.findByPk(req.params.id);
  if (!tenant || tenant.role !== 'tenant') {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  // Update tenant
  await tenant.update({
    firstName: firstName || tenant.firstName,
    lastName: lastName || tenant.lastName,
    phone: phone !== undefined ? phone : tenant.phone,
    isActive: isActive !== undefined ? isActive : tenant.isActive
  });

  res.json({
    success: true,
    message: 'Tenant updated successfully',
    data: {
      tenant: {
        id: tenant.id,
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone,
        role: tenant.role,
        isActive: tenant.isActive
      }
    }
  });
}));

// Reset tenant password to default and return credentials
router.post('/:id/reset-password', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const tenant = await User.findByPk(req.params.id);
  if (!tenant || tenant.role !== 'tenant') {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  const defaultPassword = 'password123!';
  await tenant.update({ password: defaultPassword, mustChangePassword: true });

  res.json({
    success: true,
    message: 'Tenant password reset successfully',
    data: {
      tenant: {
        id: tenant.id,
        email: tenant.email,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        password: defaultPassword
      }
    }
  });
}));

// Delete tenant
router.delete('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  // Verify tenant exists and has a lease with this landlord
  const lease = await Lease.findOne({
    where: { tenantId: req.params.id, landlordId: req.userId }
  });

  if (!lease) {
    throw new AppError('Tenant not found or not associated with your properties', 404, 'NOT_FOUND');
  }

  const tenant = await User.findByPk(req.params.id);
  if (!tenant || tenant.role !== 'tenant') {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  // Check if tenant has active leases
  const activeLeases = await Lease.findAll({
    where: {
      tenantId: req.params.id,
      status: { [Op.in]: ['active', 'pending'] }
    }
  });

  if (activeLeases.length > 0) {
    throw new AppError('Cannot delete tenant with active or pending leases', 400, 'ACTIVE_LEASES');
  }

  // Soft delete by deactivating
  await tenant.update({ isActive: false });

  res.json({
    success: true,
    message: 'Tenant deactivated successfully'
  });
}));

// Search available tenants (for lease creation)
router.get('/search/available', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    throw new AppError('Email search term required', 400, 'MISSING_SEARCH');
  }

  const tenants = await User.findAll({
    where: {
      role: 'tenant',
      isActive: true,
      email: { [Op.iLike]: `%${email}%` }
    },
    attributes: ['id', 'email', 'firstName', 'lastName', 'phone'],
    limit: 10
  });

  res.json({
    success: true,
    data: { tenants }
  });
}));

export default router;
