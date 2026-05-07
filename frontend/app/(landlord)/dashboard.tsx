import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { TrendingUp, TrendingDown, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getTenants } from '@/services/tenants';
import { getPayments } from '@/services/payments';
import { TransactionItem } from '@/components/TransactionItem';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { DashboardStats, Payment, Tenant } from '@/types/database';

export default function LandlordDashboard() {
  const { profile, user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    paidCount: 0,
    pendingCount: 0,
    lateCount: 0,
    totalCollected: 0,
    totalExpected: 0,
    highRiskCount: 0,
  });

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [tenantsData, paymentsData] = await Promise.all([
        getTenants(user.id),
        getPayments(),
      ]);

      setTenants(tenantsData);

      const paid = paymentsData.filter(p => p.status === 'paid');
      const pending = paymentsData.filter(p => p.status === 'pending');
      const late = paymentsData.filter(p => p.status === 'late');
      const highRisk = tenantsData.filter(t => t.risk_level === 'high');

      setStats({
        totalTenants: tenantsData.length,
        paidCount: paid.length,
        pendingCount: pending.length,
        lateCount: late.length,
        totalCollected: paid.reduce((s, p) => s + Number(p.amount), 0),
        totalExpected: tenantsData.reduce((s, t) => s + Number(t.rent_amount), 0),
        highRiskCount: highRisk.length,
      });

      setRecentPayments(paymentsData.slice(0, 5));
    } catch (e) {
      console.log(e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const collectionRate =
    stats.totalExpected > 0
      ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
      : 0;

  // 🛑 Prevent UI breaking if auth not ready
  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 💰 Wallet Style Header */}
      <View style={styles.walletCard}>
        <Text style={styles.greeting}>
          Hello, {profile?.name || 'Manager'}
        </Text>

        <Text style={styles.balanceLabel}>Total Collected</Text>

        <Text style={styles.balanceAmount}>
          ${stats.totalCollected.toFixed(0)}
        </Text>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => router.push('/(landlord)/payments')}
        >
          <Text style={styles.sendText}>View Payments</Text>
        </TouchableOpacity>
      </View>

      {/* ⚡ Quick Actions */}
      <View style={styles.actionsRow}>
        {['Receive', 'Pay', 'Exchange', 'Withdraw'].map((item, index) => (
          <View key={index} style={styles.actionItem}>
            <View style={styles.actionIcon} />
            <Text style={styles.actionText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* 📊 Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalTenants}</Text>
          <Text style={styles.statLabel}>Tenants</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{collectionRate}%</Text>
          <Text style={styles.statLabel}>Collection</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.lateCount}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.highRiskCount}</Text>
          <Text style={styles.statLabel}>High Risk</Text>
        </View>
      </View>

      {/* 🚨 Alert */}
      {stats.highRiskCount > 0 && (
        <View style={styles.alertCard}>
          <AlertCircle size={18} color={colors.danger} />
          <Text style={styles.alertText}>
            {stats.highRiskCount} high-risk tenant(s)
          </Text>
        </View>
      )}

      {/* 💳 Recent Payments */}
      <Text style={styles.sectionTitle}>Recent Payments</Text>

      {recentPayments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No payment records yet</Text>
        </View>
      ) : (
        recentPayments.map(p => (
          <TransactionItem
            key={p.id}
            payment={p}
            icon={<TrendingUp size={20} color={colors.primary} />}
            title={p.tenant?.full_name || 'Payment'}
            date={new Date(p.date).toLocaleDateString()}
            onPress={() => router.push('/(landlord)/payments')}
          />
        ))
      )}
    </ScrollView>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  walletCard: {
    backgroundColor: '#0B5D3B',
    margin: spacing.md,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },

  greeting: {
    color: '#CFFFE2',
    fontSize: fontSize.sm,
  },

  balanceLabel: {
    color: '#A7F3D0',
    marginTop: spacing.sm,
  },

  balanceAmount: {
    color: '#fff',
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginVertical: spacing.sm,
  },

  sendButton: {
    backgroundColor: '#22C55E',
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },

  sendText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.lg,
  },

  actionItem: { alignItems: 'center' },

  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xs,
  },

  actionText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },

  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
  },

  alertText: {
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },

  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    color: colors.textMuted,
  },
});