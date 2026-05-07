import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Building2, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';

type Role = 'landlord' | 'tenant';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('landlord');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await signUp(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      role,
      phone.trim()
    );
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successBox}>
          <CheckCircle size={56} color={colors.secondary} />
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successText}>
            Your account has been created successfully. You can now sign in.
          </Text>
          <Button label="Go to Login" onPress={() => router.replace('/(auth)/login')} style={styles.button} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Building2 size={32} color={colors.white} />
          </View>
          <Text style={styles.appName}>SmartTenant</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get started</Text>
          <Text style={styles.cardSubtitle}>Join the platform today</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.roleLabel}>I am a...</Text>
          <View style={styles.roleRow}>
            {(['landlord', 'tenant'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r === 'landlord' ? 'Property Manager' : 'Tenant'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="First Name"
            placeholder="John"
            value={firstName}
            onChangeText={setFirstName}
            icon={<User size={16} color={colors.textMuted} />}
          />

          <Input
            label="Last Name"
            placeholder="Smith"
            value={lastName}
            onChangeText={setLastName}
            icon={<User size={16} color={colors.textMuted} />}
          />

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail size={16} color={colors.textMuted} />}
          />

          <Input
            label="Phone"
            placeholder="Optional phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            icon={<Mail size={16} color={colors.textMuted} />}
          />

          <Input
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Lock size={16} color={colors.textMuted} />}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            icon={<Lock size={16} color={colors.textMuted} />}
          />

          <Button label="Create Account" onPress={handleRegister} loading={loading} style={styles.button} />

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginHighlight}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  logoArea: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text },
  tagline: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  errorBox: {
    backgroundColor: `${colors.danger}15`,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
  },
  errorText: { color: colors.dangerLight, fontSize: fontSize.sm },
  roleLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '500' },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  roleBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  roleBtnTextActive: { color: colors.primaryLight, fontWeight: fontWeight.semibold },
  button: { marginTop: spacing.sm },
  loginLink: { alignItems: 'center', marginTop: spacing.lg },
  loginText: { fontSize: fontSize.sm, color: colors.textSecondary },
  loginHighlight: { color: colors.primaryLight, fontWeight: fontWeight.semibold },
});
