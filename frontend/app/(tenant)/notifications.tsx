import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notifications';
import { NotificationItem } from '@/components/NotificationItem';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';
import { Notification } from '@/types/database';

export default function TenantNotificationsScreen() {
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
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontSize: 13, color: colors.primaryLight, fontWeight: fontWeight.medium },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: fontWeight.semibold, color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
