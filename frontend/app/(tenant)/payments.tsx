import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTenantByProfileId } from '@/services/tenants';
import { getPaymentsByTenant } from '@/services/payments';
import { PaymentItem } from '@/components/PaymentItem';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Payment, Tenant } from '@/types/database';

export default function TenantPaymentsScreen() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'late'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    const t = await getTenantByProfileId(user.id);
    setTenant(t);
    if (t) {
      const p = await getPaymentsByTenant(t.id);
      setPayments(p);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

  if (!tenant) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Payment History" />
        <View style={styles.noTenant}>
          <Text style={styles.noTenantText}>No rental unit linked to your account</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Payment History" subtitle={`${payments.length} total payments`} />

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${totalPaid.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Total Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{payments.filter(p => p.status === 'paid').length}</Text>
          <Text style={styles.summaryLabel}>On Time</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, payments.filter(p => p.status === 'late').length > 0 && styles.lateValue]}>
            {payments.filter(p => p.status === 'late').length}
          </Text>
          <Text style={styles.summaryLabel}>Late</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(['all', 'paid', 'pending', 'late'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} payments found</Text>
          </View>
        ) : (
          filtered.map(p => <PaymentItem key={p.id} payment={p} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  noTenant: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noTenantText: { color: colors.textMuted, fontSize: fontSize.md },
  summaryCard: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg,
    marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  lateValue: { color: colors.dangerLight },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  filterRow: { flexGrow: 0, marginBottom: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primaryLight },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
});
