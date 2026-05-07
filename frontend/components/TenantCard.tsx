import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Phone, Hop as Home, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Tenant, RiskLevel } from '@/types/database';

interface TenantCardProps {
  tenant: Tenant;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const riskBadge: Record<RiskLevel, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export function TenantCard({ tenant, onPress }: TenantCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{tenant.full_name}</Text>
          {tenant.unit_number ? (
            <View style={styles.row}>
              <Home size={12} color={colors.textMuted} />
              <Text style={styles.unit}>Unit {tenant.unit_number}</Text>
            </View>
          ) : null}
        </View>
        <Badge label={tenant.risk_level} variant={riskBadge[tenant.risk_level]} />
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Rent</Text>
          <Text style={styles.footerValue}>${Number(tenant.rent_amount).toFixed(0)}/mo</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Due</Text>
          <Text style={styles.footerValue}>Day {tenant.due_date}</Text>
        </View>
        {tenant.phone ? (
          <View style={styles.footerItem}>
            <Phone size={12} color={colors.textMuted} />
            <Text style={styles.footerPhone}>{tenant.phone}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  unit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  footerValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  footerPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
