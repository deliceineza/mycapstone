import cron from 'node-cron';
import { Payment, Lease, Unit, Notification } from '../models/index.js';
import { Op } from 'sequelize';
import { sendPaymentReminder, sendLeaseExpiringNotification, createNotification } from './notificationService.js';

// Generate monthly rent payments for all active leases
export const generateMonthlyPayments = async () => {
  console.log('[Cron] Generating monthly payments...');
  
  try {
    const leases = await Lease.findAll({
      where: { status: 'active' }
    });

    const currentDate = new Date();
    let generated = 0;

    for (const lease of leases) {
      const dueDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        lease.paymentDueDay
      );

      // Check if payment already exists for this month
      const existingPayment = await Payment.findOne({
        where: {
          leaseId: lease.id,
          paymentType: 'rent',
          dueDate: {
            [Op.between]: [
              new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
            ]
          }
        }
      });

      if (!existingPayment) {
        await Payment.create({
          leaseId: lease.id,
          tenantId: lease.tenantId,
          landlordId: lease.landlordId,
          amount: lease.monthlyRent,
          lateFee: 0,
          totalAmount: lease.monthlyRent,
          dueDate,
          paymentType: 'rent',
          status: 'pending'
        });
        generated++;
      }
    }

    console.log(`[Cron] Generated ${generated} payment records`);
    return { success: true, generated };
  } catch (error) {
    console.error('[Cron] Error generating payments:', error);
    return { success: false, error: error.message };
  }
};

// Send payment reminders
export const sendPaymentReminders = async () => {
  console.log('[Cron] Sending payment reminders...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find pending payments
    const pendingPayments = await Payment.findAll({
      where: {
        status: 'pending'
      }
    });

    let sent = 0;

    for (const payment of pendingPayments) {
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      // Send reminders at specific intervals
      if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1 || daysUntilDue === 0) {
        await sendPaymentReminder(payment, daysUntilDue);
        sent++;
      }

      // Send overdue reminders every 3 days
      if (daysUntilDue < 0 && daysUntilDue % 3 === 0) {
        // Calculate and apply late fee if within grace period
        const lease = await Lease.findByPk(payment.leaseId);
        if (Math.abs(daysUntilDue) > lease.lateFeeGracePeriod && payment.lateFee === 0) {
          await payment.update({
            lateFee: lease.lateFeeAmount,
            totalAmount: parseFloat(payment.amount) + parseFloat(lease.lateFeeAmount)
          });
        }
        await sendPaymentReminder(payment, daysUntilDue);
        sent++;
      }
    }

    console.log(`[Cron] Sent ${sent} payment reminders`);
    return { success: true, sent };
  } catch (error) {
    console.error('[Cron] Error sending reminders:', error);
    return { success: false, error: error.message };
  }
};

// Check for expiring leases
export const checkExpiringLeases = async () => {
  console.log('[Cron] Checking expiring leases...');
  
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLeases = await Lease.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.between]: [today, thirtyDaysFromNow]
        }
      }
    });

    let notified = 0;

    for (const lease of expiringLeases) {
      const endDate = new Date(lease.endDate);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      // Notify at 30, 14, 7, and 3 days
      if ([30, 14, 7, 3].includes(daysUntilExpiry)) {
        await sendLeaseExpiringNotification(lease, daysUntilExpiry);
        notified++;
      }
    }

    console.log(`[Cron] Sent ${notified} lease expiry notifications`);
    return { success: true, notified };
  } catch (error) {
    console.error('[Cron] Error checking leases:', error);
    return { success: false, error: error.message };
  }
};

// Update expired leases
export const updateExpiredLeases = async () => {
  console.log('[Cron] Updating expired leases...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredLeases = await Lease.findAll({
      where: {
        status: 'active',
        endDate: { [Op.lt]: today }
      },
      include: [{ model: Unit, as: 'unit' }]
    });

    for (const lease of expiredLeases) {
      if (lease.autoRenew) {
        // Auto-renew for another year
        const newEndDate = new Date(lease.endDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        
        await lease.update({ endDate: newEndDate });
        
        await createNotification({
          userId: lease.tenantId,
          type: 'lease_expiring',
          title: 'Lease Auto-Renewed',
          body: `Your lease has been automatically renewed until ${newEndDate.toLocaleDateString()}`,
          data: { leaseId: lease.id }
        });
      } else {
        await lease.update({ status: 'expired' });
        await lease.unit.update({ status: 'vacant' });
      }
    }

    console.log(`[Cron] Updated ${expiredLeases.length} expired leases`);
    return { success: true, updated: expiredLeases.length };
  } catch (error) {
    console.error('[Cron] Error updating leases:', error);
    return { success: false, error: error.message };
  }
};

// Activate pending leases
export const activatePendingLeases = async () => {
  console.log('[Cron] Activating pending leases...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingLeases = await Lease.findAll({
      where: {
        status: 'pending',
        startDate: { [Op.lte]: today }
      },
      include: [{ model: Unit, as: 'unit' }]
    });

    for (const lease of pendingLeases) {
      await lease.update({ status: 'active' });
      await lease.unit.update({ status: 'occupied' });
    }

    console.log(`[Cron] Activated ${pendingLeases.length} leases`);
    return { success: true, activated: pendingLeases.length };
  } catch (error) {
    console.error('[Cron] Error activating leases:', error);
    return { success: false, error: error.message };
  }
};

// Initialize all cron jobs
export const initCronJobs = () => {
  // Generate monthly payments - 1st of every month at midnight
  cron.schedule('0 0 1 * *', generateMonthlyPayments);

  // Send payment reminders - every day at 9 AM
  cron.schedule('0 9 * * *', sendPaymentReminders);

  // Check expiring leases - every day at 10 AM
  cron.schedule('0 10 * * *', checkExpiringLeases);

  // Update expired leases - every day at midnight
  cron.schedule('0 0 * * *', updateExpiredLeases);

  // Activate pending leases - every day at 12:01 AM
  cron.schedule('1 0 * * *', activatePendingLeases);

  console.log('[Cron] All cron jobs initialized');
};

export default {
  generateMonthlyPayments,
  sendPaymentReminders,
  checkExpiringLeases,
  updateExpiredLeases,
  activatePendingLeases,
  initCronJobs
};
