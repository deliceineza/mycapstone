import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle } from 'lucide-react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Payment, PaymentStatus } from '@/types/database';
import { getStatusColor } from '@/services/payments';

interface PaymentItemProps {
  payment: Payment;
  showTenant?: boolean;
}

const statusIcons: Record<PaymentStatus, React.ReactNode> = {
  paid: <CheckCircle size={16} color="#34D399" />,
  pending: <Clock size={16} color="#FCD34D" />,
  late: <AlertCircle size={16} color="#F87171" />,
};

export function PaymentItem({ payment, showTenant }: PaymentItemProps) {
  const statusColor = getStatusColor(payment.status);
  const date = new Date(payment.date);

  return (
    <View style={styles.item}>
      <View style={[styles.iconBox, { backgroundColor: `${statusColor}20` }]}>
        <CreditCard size={18} color={statusColor} />
      </View>
      <View style={styles.content}>
        {showTenant && payment.tenant && (
          <Text style={styles.tenantName}>{payment.tenant.full_name}</Text>
        )}
        <Text style={styles.date}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        {payment.notes ? <Text style={styles.notes}>{payment.notes}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>${Number(payment.amount).toFixed(2)}</Text>
        <View style={styles.statusRow}>
          {statusIcons[payment.status]}
          <Text style={[styles.status, { color: statusColor }]}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  tenantName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  status: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
