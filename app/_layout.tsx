import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../lib/hooks/useSession';

export default function RootLayout() {
  const { session, role, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && !role) {
      // Session just appeared (e.g. right after login) but the role query
      // hasn't resolved yet — wait rather than defaulting to patient, or
      // this briefly flashes the wrong home screen for doctors.
      return;
    } else if (session && inAuthGroup) {
      router.replace(role === 'doctor' ? '/(doctor)/dashboard' : '/(patient)/home');
    }
  }, [session, role, isLoading, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
