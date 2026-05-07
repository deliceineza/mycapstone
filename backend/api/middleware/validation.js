import { validationResult, body, param, query } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('role')
    .isIn(['landlord', 'tenant'])
    .withMessage('Role must be either landlord or tenant'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  validate
];

export const loginValidation = [
  body('identifier')
    .custom((value, { req }) => {
      const { identifier, email, phone } = req.body;
      const loginIdentifier = identifier || email || phone;

      if (!loginIdentifier || String(loginIdentifier).trim() === '') {
        throw new Error('Email or phone is required');
      }

      return true;
    }),
  body(['identifier', 'email', 'phone'])
    .optional()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

export const propertyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Property name is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  body('propertyType')
    .isIn(['apartment', 'house', 'condo', 'townhouse', 'commercial'])
    .withMessage('Invalid property type'),
  validate
];

export const unitValidation = [
  body('unitNumber')
    .trim()
    .notEmpty()
    .withMessage('Unit number is required'),
  body('bedrooms')
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a positive number'),
  body('bathrooms')
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a positive number'),
  body('rentAmount')
    .isFloat({ min: 0 })
    .withMessage('Rent amount must be a positive number'),
  validate
];

export const leaseValidation = [
  body('unitId')
    .isUUID()
    .withMessage('Valid unit ID is required'),
  body('tenantId')
    .isUUID()
    .withMessage('Valid tenant ID is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('monthlyRent')
    .isFloat({ min: 0 })
    .withMessage('Monthly rent must be a positive number'),
  validate
];

export const paymentValidation = [
  body('leaseId')
    .isUUID()
    .withMessage('Valid lease ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentType')
    .optional()
    .isIn(['rent', 'deposit', 'late_fee', 'maintenance', 'other'])
    .withMessage('Invalid payment type'),
  validate
];

export const messageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 5000 })
    .withMessage('Message must be less than 5000 characters'),
  validate
];

export const maintenanceValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('category')
    .isIn(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'emergency'])
    .withMessage('Invalid priority'),
  validate
];

export const uuidParam = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`),
  validate
];

export const paginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];
