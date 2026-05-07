import { Notification, User, Payment, Lease, Unit, Property } from '../models/index.js';
import { Op } from 'sequelize';

// Push notification service (placeholder for Expo push notifications)
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user?.pushToken || !user.notificationPreferences.push) {
      return { success: false, reason: 'No push token or disabled' };
    }

    // In production, integrate with Expo Push API
    // const expoPushToken = user.pushToken;
    // await expo.sendPushNotificationsAsync([{
    //   to: expoPushToken,
    //   sound: 'default',
    //   title,
    //   body,
    //   data
    // }]);

    console.log(`[Push] Would send to ${user.email}: ${title}`);
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
};

// Email notification service (placeholder)
export const sendEmailNotification = async (userId, subject, htmlContent) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user?.email || !user.notificationPreferences.email) {
      return { success: false, reason: 'No email or disabled' };
    }

    // In production, integrate with email service (SendGrid, etc.)
    // await sendgrid.send({
    //   to: user.email,
    //   from: 'noreply@tenantapp.com',
    //   subject,
    //   html: htmlContent
    // });

    console.log(`[Email] Would send to ${user.email}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

// Create and optionally send notification
export const createNotification = async ({
  userId,
  type,
  title,
  body,
  data = {},
  sendPush = true,
  sendEmail = false
}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      data,
      sentVia: { push: false, email: false, sms: false }
    });

    const sentVia = { push: false, email: false, sms: false };

    if (sendPush) {
      const pushResult = await sendPushNotification(userId, title, body, data);
      sentVia.push = pushResult.success;
    }

    if (sendEmail) {
      const emailResult = await sendEmailNotification(userId, title, body);
      sentVia.email = emailResult.success;
    }

    await notification.update({ sentVia, sentAt: new Date() });

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Send payment reminder
export const sendPaymentReminder = async (payment, daysUntilDue) => {
  const lease = await Lease.findByPk(payment.leaseId, {
    include: [
      { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] }
    ]
  });

  let title, body;
  
  if (daysUntilDue > 0) {
    title = 'Payment Reminder';
    body = `Your rent payment of $${payment.totalAmount} for ${lease.unit.property.name} is due in ${daysUntilDue} days.`;
  } else if (daysUntilDue === 0) {
    title = 'Payment Due Today';
    body = `Your rent payment of $${payment.totalAmount} for ${lease.unit.property.name} is due today.`;
  } else {
    title = 'Payment Overdue';
    body = `Your rent payment of $${payment.totalAmount} for ${lease.unit.property.name} is ${Math.abs(daysUntilDue)} days overdue.`;
  }

  return createNotification({
    userId: payment.tenantId,
    type: daysUntilDue < 0 ? 'payment_overdue' : 'payment_reminder',
    title,
    body,
    data: { paymentId: payment.id, leaseId: payment.leaseId },
    sendPush: true,
    sendEmail: daysUntilDue <= 0 // Send email if due today or overdue
  });
};

// Send lease expiring notification
export const sendLeaseExpiringNotification = async (lease, daysUntilExpiry) => {
  const fullLease = await Lease.findByPk(lease.id, {
    include: [
      { model: Unit, as: 'unit', include: [{ model: Property, as: 'property' }] },
      { model: User, as: 'tenant', attributes: ['id', 'firstName'] },
      { model: User, as: 'landlord', attributes: ['id', 'firstName'] }
    ]
  });

  const title = 'Lease Expiring Soon';
  const body = `Your lease for ${fullLease.unit.property.name} Unit ${fullLease.unit.unitNumber} expires in ${daysUntilExpiry} days.`;

  // Notify both tenant and landlord
  await Promise.all([
    createNotification({
      userId: fullLease.tenantId,
      type: 'lease_expiring',
      title,
      body,
      data: { leaseId: lease.id },
      sendPush: true,
      sendEmail: true
    }),
    createNotification({
      userId: fullLease.landlordId,
      type: 'lease_expiring',
      title: 'Tenant Lease Expiring',
      body: `Lease for ${fullLease.tenant.firstName} at ${fullLease.unit.property.name} Unit ${fullLease.unit.unitNumber} expires in ${daysUntilExpiry} days.`,
      data: { leaseId: lease.id },
      sendPush: true,
      sendEmail: true
    })
  ]);
};

export default {
  sendPushNotification,
  sendEmailNotification,
  createNotification,
  sendPaymentReminder,
  sendLeaseExpiringNotification
};
