import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';

interface BalanceCardProps {
  label: string;
  amount: number | string;
  onPayPress?: () => void;
  onSendPress?: () => void;
}

export function BalanceCard({ label, amount, onPayPress, onSendPress }: BalanceCardProps) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>
        ${typeof amount === 'string' ? amount : amount.toFixed(2)}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={onPayPress}
          style={styles.button}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Pay Rent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSendPress}
          style={styles.button}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.md,
  },
  amount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xxl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
