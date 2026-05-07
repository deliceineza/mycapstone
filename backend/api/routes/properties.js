import express from 'express';
import { Property, Unit, User, Lease } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { propertyValidation, unitValidation, uuidParam, paginationQuery } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all properties for landlord
router.get('/', authenticate, authorize('landlord'), paginationQuery, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { count, rows: properties } = await Property.findAndCountAll({
    where: { landlordId: req.userId },
    include: [
      {
        model: Unit,
        as: 'units',
        attributes: ['id', 'unitNumber', 'status', 'rentAmount']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  res.json({
    success: true,
    data: {
      properties,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get single property
router.get('/:id', authenticate, ...uuidParam('id'), asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.id },
    include: [
      {
        model: Unit,
        as: 'units',
        include: [
          {
            model: Lease,
            as: 'leases',
            where: { status: 'active' },
            required: false,
            include: [
              {
                model: User,
                as: 'tenant',
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
              }
            ]
          }
        ]
      },
      {
        model: User,
        as: 'landlord',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }
    ]
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  // Check access
  if (req.user.role === 'landlord' && property.landlordId !== req.userId) {
    throw new AppError('Not authorized to view this property', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: { property }
  });
}));

// Create property
router.post('/', authenticate, authorize('landlord'), propertyValidation, asyncHandler(async (req, res) => {
  const property = await Property.create({
    ...req.body,
    landlordId: req.userId
  });

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: { property }
  });
}));

// Update property
router.put('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.id, landlordId: req.userId }
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const allowedUpdates = ['name', 'address', 'city', 'state', 'zipCode', 'country', 
                          'propertyType', 'description', 'amenities', 'images', 'isActive'];
  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  await property.update(updates);

  res.json({
    success: true,
    message: 'Property updated successfully',
    data: { property }
  });
}));

// Delete property
router.delete('/:id', authenticate, authorize('landlord'), ...uuidParam('id'), asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.id, landlordId: req.userId },
    include: [{ model: Unit, as: 'units' }]
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  // Check for active leases
  const activeLeases = await Lease.count({
    where: { status: 'active' },
    include: [{
      model: Unit,
      as: 'unit',
      where: { propertyId: property.id }
    }]
  });

  if (activeLeases > 0) {
    throw new AppError('Cannot delete property with active leases', 400, 'ACTIVE_LEASES');
  }

  await property.destroy();

  res.json({
    success: true,
    message: 'Property deleted successfully'
  });
}));

// UNIT ROUTES

// Get all units for a property
router.get('/:propertyId/units', authenticate, ...uuidParam('propertyId'), asyncHandler(async (req, res) => {
  const property = await Property.findByPk(req.params.propertyId);
  
  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const units = await Unit.findAll({
    where: { propertyId: req.params.propertyId },
    include: [
      {
        model: Lease,
        as: 'leases',
        where: { status: 'active' },
        required: false,
        include: [
          {
            model: User,
            as: 'tenant',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      }
    ],
    order: [['unitNumber', 'ASC']]
  });

  res.json({
    success: true,
    data: { units }
  });
}));

// Create unit
router.post('/:propertyId/units', authenticate, authorize('landlord'), ...uuidParam('propertyId'), unitValidation, asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.propertyId, landlordId: req.userId }
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const unit = await Unit.create({
    ...req.body,
    propertyId: property.id
  });

  // Update property unit count
  await property.increment('units');

  res.status(201).json({
    success: true,
    message: 'Unit created successfully',
    data: { unit }
  });
}));

// Update unit
router.put('/:propertyId/units/:unitId', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.propertyId, landlordId: req.userId }
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const unit = await Unit.findOne({
    where: { id: req.params.unitId, propertyId: property.id }
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  const allowedUpdates = ['unitNumber', 'floor', 'bedrooms', 'bathrooms', 
                          'squareFeet', 'rentAmount', 'depositAmount', 'status', 'features', 'images'];
  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  await unit.update(updates);

  res.json({
    success: true,
    message: 'Unit updated successfully',
    data: { unit }
  });
}));

// Delete unit
router.delete('/:propertyId/units/:unitId', authenticate, authorize('landlord'), asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    where: { id: req.params.propertyId, landlordId: req.userId }
  });

  if (!property) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const unit = await Unit.findOne({
    where: { id: req.params.unitId, propertyId: property.id }
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  // Check for active leases
  const activeLeases = await Lease.count({
    where: { unitId: unit.id, status: 'active' }
  });

  if (activeLeases > 0) {
    throw new AppError('Cannot delete unit with active lease', 400, 'ACTIVE_LEASE');
  }

  await unit.destroy();
  await property.decrement('units');

  res.json({
    success: true,
    message: 'Unit deleted successfully'
  });
}));

export default router;
