import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize, spacing } from '@/constants/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(5,150,105,0.15)', text: '#34D399' },
  warning: { bg: 'rgba(217,119,6,0.15)', text: '#FCD34D' },
  danger: { bg: 'rgba(220,38,38,0.15)', text: '#F87171' },
  info: { bg: 'rgba(2,132,199,0.15)', text: '#38BDF8' },
  default: { bg: colors.surfaceAlt, text: colors.textSecondary },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const c = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
