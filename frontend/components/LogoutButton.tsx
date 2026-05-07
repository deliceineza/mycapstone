import React, { useState } from 'react';
import { TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface LogoutButtonProps {
  size?: number;
  color?: string;
}

export function LogoutButton({ size = 24, color = colors.text }: LogoutButtonProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
              (router as any).replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoading(true);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      disabled={loading}
      style={styles.button}
      activeOpacity={0.7}
    >
      <LogOut size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  }
});
