import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Payment } from '@/types/database';

interface TransactionItemProps {
  payment: Payment;
  icon: React.ReactNode;
  title: string;
  date: string;
  onPress?: () => void;
}

export function TransactionItem({ icon, title, date, payment, onPress }: TransactionItemProps) {
  const isPositive = payment.status === 'paid';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.item}
      activeOpacity={0.6}
    >
      <View style={styles.iconWrapper}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={[styles.amount, isPositive ? styles.amountPositive : styles.amountNegative]}>
        {isPositive ? '-' : '+'} ${Number(payment.amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  amount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  amountPositive: {
    color: colors.primary,
  },
  amountNegative: {
    color: colors.danger,
  },
});
