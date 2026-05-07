import { apiGet, apiPut, apiPost } from '@/lib/api';
import { Notification, NotificationType } from '@/types/database';

const notificationTypeMap: Record<NotificationType, 'system' | 'payment_received' | 'payment_reminder'> = {
  info: 'system',
  warning: 'system',
  payment: 'payment_received',
  reminder: 'payment_reminder'
};

const frontendTypeMap: Record<string, NotificationType> = {
  payment_received: 'payment',
  payment_reminder: 'reminder',
  payment_overdue: 'warning',
  lease_expiring: 'warning',
  maintenance_update: 'info',
  new_message: 'info',
  announcement: 'info',
  system: 'info'
};

function mapBackendNotification(notification: any): Notification {
  return {
    id: notification.id,
    user_id: notification.userId,
    message: notification.body || notification.message || notification.title,
    type: frontendTypeMap[notification.type] || 'info',
    is_read: Boolean(notification.isRead),
    created_at: notification.createdAt
  };
}

export async function createNotification(userId: string, message: string, type: NotificationType): Promise<void> {
  const backendType = notificationTypeMap[type] || 'system';
  const title = message.length > 80 ? `${message.slice(0, 77)}...` : message;

  await apiPost('/api/notifications', {
    title,
    body: message,
    type: backendType,
    data: { createdBy: userId }
  });
}

export async function getNotifications(): Promise<Notification[]> {
  const data = await apiGet<{ notifications: any[] }>('/api/notifications');
  return (data.notifications || []).map(mapBackendNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPut(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPut('/api/notifications/read-all', {});
}

export async function getUnreadNotificationCount(): Promise<number> {
  const data = await apiGet<{ unreadCount: number }>('/api/notifications/unread-count');
  return data.unreadCount || 0;
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'payment': return 'credit-card';
    case 'reminder': return 'clock';
    case 'warning': return 'alert-triangle';
    default: return 'bell';
  }
}
