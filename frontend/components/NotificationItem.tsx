import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, CreditCard, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Notification, NotificationType } from '@/types/database';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Bell size={16} color="#38BDF8" />, color: 'rgba(2,132,199,0.15)' },
  payment: { icon: <CreditCard size={16} color="#34D399" />, color: 'rgba(5,150,105,0.15)' },
  reminder: { icon: <Clock size={16} color="#FCD34D" />, color: 'rgba(217,119,6,0.15)' },
  warning: { icon: <AlertTriangle size={16} color="#F87171" />, color: 'rgba(220,38,38,0.15)' },
};

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const time = new Date(notification.created_at);
  const timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.item, !notification.is_read && styles.unread]}
    >
      <View style={[styles.iconBox, { backgroundColor: config.color }]}>
        {config.icon}
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.time}>{timeStr}</Text>
      </View>
      {!notification.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}08`,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
