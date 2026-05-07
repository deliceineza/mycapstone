import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { CreditCard, MessageSquare, Send, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getTenantByProfileId } from '@/services/tenants';
import { getPaymentsByTenant } from '@/services/payments';
import { getUnreadNotificationCount } from '@/services/notifications';
import { FinanceHeader } from '@/components/FinanceHeader';
import { BalanceCard } from '@/components/BalanceCard';
import { ActionButtonRow } from '@/components/ActionButtonRow';
import { TransactionItem } from '@/components/TransactionItem';
import { LogoutButton } from '@/components/LogoutButton';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Payment, Tenant } from '@/types/database';

export default function TenantDashboard() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const t = await getTenantByProfileId(user.id);
    setTenant(t);
    if (t) {
      const p = await getPaymentsByTenant(t.id);
      setPayments(p);
    }
    const uc = await getUnreadNotificationCount();
    setUnreadCount(uc);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const rentBalance = tenant ? Number(tenant.rent_amount) : 0;
  const recentPayments = payments.slice(0, 4);

  const actionButtons = [
    {
      icon: <CreditCard size={24} color={colors.primary} />,
      onPress: () => router.push('/(tenant)/payments'),
      label: 'Pay',
    },
    {
      icon: <MessageCircle size={24} color={colors.primary} />,
      onPress: () => router.push('/(tenant)/messages'),
      label: 'Bills',
    },
    {
      icon: <MessageSquare size={24} color={colors.primary} />,
      onPress: () => router.push('/(tenant)/messages'),
      label: 'Messages',
    },
    {
      icon: <Send size={24} color={colors.primary} />,
      onPress: () => router.push('/(tenant)/chatbot'),
      label: 'More',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      scrollIndicatorInsets={{ right: 1 }}
    >
      <View style={styles.heroSection}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <FinanceHeader
              name={profile?.name || 'User'}
              onNotificationPress={() => router.push('/(tenant)/notifications')}
              unreadCount={unreadCount}
            />
          </View>
          <LogoutButton size={20} color={colors.primary} />
        </View>

        {tenant ? (
          <View style={styles.balanceCardWrapper}>
            <BalanceCard
              label="Total Rent Balance"
              amount={rentBalance}
              onPayPress={() => router.push('/(tenant)/payments')}
              onSendPress={() => router.push('/(tenant)/messages')}
            />
          </View>
        ) : (
          <View style={styles.notLinkedCard}>
            <Text style={styles.notLinkedTitle}>Not Linked to Unit</Text>
            <Text style={styles.notLinkedText}>
              Your account is not yet linked to a rental unit. Please contact your landlord to complete the setup.
            </Text>
          </View>
        )}
      </View>
      {tenant ? (
        <>

          <ActionButtonRow buttons={actionButtons} />

          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No payment records yet</Text>
            </View>
          ) : (
            recentPayments.map(p => (
              <TransactionItem
                key={p.id}
                payment={p}
                icon={<CreditCard size={20} color={colors.primary} />}
                title={`Rent Payment`}
                date={new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                onPress={() => router.push('/(tenant)/payments')}
              />
            ))
          )}
          <View style={styles.spacer} />
        </>
      ) : (
        <View style={styles.noTenantCard}>
          <CreditCard size={40} color={colors.textMuted} />
          <Text style={styles.noTenantTitle}>Not Linked to a Unit</Text>
          <Text style={styles.noTenantText}>
            Your account hasn't been linked to a rental unit yet. Please contact your property manager.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
  heroSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    marginHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceCardWrapper: { marginTop: spacing.lg },
  notLinkedCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xxxl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
  },
  notLinkedTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  notLinkedText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  emptyBox: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
  spacer: { height: spacing.xxxl },
  noTenantCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xxxl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
  },
  noTenantTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  noTenantText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
