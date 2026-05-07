import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/theme';

function NavigationGuard() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const onChangePassword = inAuth && segments[1] === 'change-password';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (profile?.mustChangePassword && !onChangePassword) {
      router.replace('/(auth)/change-password');
      return;
    }

    if (profile) {
      if (inAuth && !onChangePassword) {
        (router as any).replace(profile.role === 'landlord' ? '/(landlord)' : '/(tenant)');
      } else if (segments[0] === '(landlord)' && profile.role !== 'landlord') {
        router.replace('/(tenant)');
      } else if (segments[0] === '(tenant)' && profile.role !== 'tenant') {
        (router as any).replace('/(landlord)');
      }
    }
  }, [session, profile, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(landlord)" />
        <Stack.Screen name="(tenant)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
