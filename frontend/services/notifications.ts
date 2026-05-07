import { apiGet, apiPut, apiPost } from '@/lib/api';
import { Notification, NotificationType } from '@/types/database';

const notificationTypeMap: Record<NotificationType, 'system' | 'payment_received' | 'payment_reminder'> = {
  info: 'system',
  warning: 'system',
  payment: 'payment_received',
  reminder: 'payment_reminder'
};

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
  const data = await apiGet<{ notifications: Notification[] }>('/api/notifications');
  return data.notifications || [];
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
