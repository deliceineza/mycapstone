import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';

interface ActionButton {
  icon: React.ReactNode;
  onPress: () => void;
  label?: string;
}

interface ActionButtonRowProps {
  buttons: ActionButton[];
}

export function ActionButtonRow({ buttons }: ActionButtonRowProps) {
  return (
    <View style={styles.row}>
      {buttons.map((btn, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={btn.onPress}
          style={styles.button}
          activeOpacity={0.7}
        >
          <View style={styles.icon}>{btn.icon}</View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
