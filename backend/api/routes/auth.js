import express from 'express';
import { Op } from 'sequelize';
import { User } from '../models/index.js';
import { generateToken, generateRefreshToken, verifyToken, authenticate } from '../middleware/auth.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Register
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body;

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [
        { email },
        { phone }
      ]
    }
  });

  if (existingUser && existingUser.role !== role) {
    throw new AppError('This email or phone is already registered with a different account type', 409, 'ACCOUNT_CONFLICT');
  }

  if (existingUser) {
    // Match existing tenant account by email or phone and update profile details
    if (existingUser.role !== 'tenant') {
      throw new AppError('This account is already registered as a landlord', 409, 'EMAIL_EXISTS');
    }

    const duplicateConflict = await User.findOne({
      where: {
        id: { [Op.ne]: existingUser.id },
        [Op.or]: [
          { email },
          { phone }
        ]
      }
    });

    if (duplicateConflict) {
      throw new AppError('Email or phone is already used by another account', 409, 'ACCOUNT_CONFLICT');
    }

    await existingUser.update({
      firstName,
      lastName,
      phone: phone || existingUser.phone,
      password,
      mustChangePassword: false
    });

    const token = generateToken(existingUser.id);
    const refreshToken = generateRefreshToken(existingUser.id);

    return res.status(200).json({
      success: true,
      message: 'Tenant account matched and updated successfully',
      data: {
        user: existingUser.toJSON(),
        token,
        refreshToken
      }
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role,
    mustChangePassword: role === 'tenant' ? false : false
  });

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toJSON(),
      token,
      refreshToken
    }
  });
}));

// Login
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  console.log(`[Auth] Login attempt for identifier: ${identifier}`);
  const startTime = Date.now();

  let user = null;

  if (identifier.includes('@')) {
    user = await User.findOne({ where: { email: identifier } });
  }

  if (!user) {
    user = await User.findOne({ where: { phone: identifier } });
  }

  console.log(`[Auth] User lookup took ${Date.now() - startTime}ms`);
  
  if (!user) {
    throw new AppError('Invalid email or phone or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
  }

  const passwordCheckStart = Date.now();
  const isMatch = await user.comparePassword(password);
  console.log(`[Auth] Password comparison took ${Date.now() - passwordCheckStart}ms`);
  
  if (!isMatch) {
    throw new AppError('Invalid email or phone or password', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await user.update({ lastLoginAt: new Date() });

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  console.log(`[Auth] Login successful for ${identifier}, total time: ${Date.now() - startTime}ms`);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token,
      refreshToken
    }
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'MISSING_TOKEN');
  }

  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findByPk(decoded.userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
  }

  const newToken = generateToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken
    }
  });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
}));

// Update profile
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, profileImage, notificationPreferences } = req.body;

  const updates = {};
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (phone !== undefined) updates.phone = phone;
  if (profileImage !== undefined) updates.profileImage = profileImage;
  if (notificationPreferences) updates.notificationPreferences = notificationPreferences;

  await req.user.update(updates);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: req.user.toJSON()
    }
  });
}));

// Change password
router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400, 'MISSING_FIELDS');
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400, 'WEAK_PASSWORD');
  }

  const isMatch = await req.user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, 'WRONG_PASSWORD');
  }

  await req.user.update({ password: newPassword });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Update push token
router.put('/push-token', authenticate, asyncHandler(async (req, res) => {
  const { pushToken } = req.body;

  await req.user.update({ pushToken });

  res.json({
    success: true,
    message: 'Push token updated'
  });
}));

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a production app, you might want to blacklist the token
  // For now, we just return success and let the client remove the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

export default router;
