import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Bell, CheckCheck, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markAllNotificationsRead, markNotificationRead, createNotification } from '@/services/notifications';
import { getTenants } from '@/services/tenants';
import { NotificationItem } from '@/components/NotificationItem';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Notification } from '@/types/database';

export default function LandlordNotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getNotifications();
    setNotifications(data);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead();
    await load();
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const handleGenerateReminders = async () => {
    if (!user) return;
    const tenants = await getTenants(user.id);
    const today = new Date().getDate();
    let count = 0;
    for (const tenant of tenants) {
      const daysUntilDue = tenant.due_date - today;
      if (daysUntilDue === 3 || daysUntilDue === 1) {
        await createNotification(
          user.id,
          `Reminder: Rent due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} for ${tenant.full_name} (Unit ${tenant.unit_number || 'N/A'})`,
          'reminder'
        );
        count++;
      } else if (daysUntilDue < 0) {
        await createNotification(
          user.id,
          `Overdue: ${tenant.full_name} has not paid rent (due day ${tenant.due_date})`,
          'warning'
        );
        count++;
      }
    }
    if (count === 0) {
      await createNotification(user.id, 'No upcoming or overdue payments found today', 'info');
    }
    await load();
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <CheckCheck size={16} color={colors.primaryLight} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.reminderBanner}>
        <AlertTriangle size={16} color={colors.warning} />
        <Text style={styles.reminderText}>Check for due/overdue rent payments</Text>
        <TouchableOpacity onPress={handleGenerateReminders} style={styles.checkBtn}>
          <Text style={styles.checkBtnText}>Run Check</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Bell size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onPress={() => handleMarkRead(n.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  markAllText: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: fontWeight.medium },
  reminderBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: `${colors.warning}15`, borderRadius: radius.md,
    padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: `${colors.warning}30`,
  },
  reminderText: { flex: 1, fontSize: fontSize.sm, color: colors.warningLight },
  checkBtn: {
    backgroundColor: `${colors.warning}30`, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  checkBtnText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.semibold },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
});
