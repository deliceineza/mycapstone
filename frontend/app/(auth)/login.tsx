import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Building2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: err, user } = await signIn(identifier.trim(), password);
      if (err) {
        // Provide more helpful error messages
        if (err.includes('timeout') || err.includes('not responding')) {
          setError('Connection timeout. Please check your internet and try again.');
        } else if (err.includes('unable to reach') || err.includes('Network error')) {
          setError('Cannot reach the server. Please check your internet connection.');
        } else if (err.includes('Invalid email or password')) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(err);
        }
      } else if (user) {
        if (user.mustChangePassword) {
          (router as any).replace('/(auth)/change-password');
        } else if (user.role === 'tenant') {
          (router as any).replace('/(tenant)/index');
        } else if (user.role === 'landlord') {
          (router as any).replace('/(landlord)/index');
        } else {
          (router as any).replace('/(auth)/login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Building2 size={32} color={colors.white} />
          </View>
          <Text style={styles.appName}>SmartTenant</Text>
          <Text style={styles.tagline}>Rent payment made simple</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log In to Continue</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email or phone"
            placeholder="you@example.com or +15550000000"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            icon={<Mail size={18} color={colors.primary} />}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Lock size={18} color={colors.primary} />}
          />

          <Button label="Sign In" onPress={handleLogin} loading={loading} style={styles.button} />

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xxl,
  },
  errorBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
  button: { marginTop: spacing.lg },
  registerLink: { alignItems: 'center', marginTop: spacing.xxl },
  registerText: { fontSize: fontSize.sm, color: colors.textMuted },
  registerHighlight: { color: colors.primary, fontWeight: fontWeight.semibold },
});
