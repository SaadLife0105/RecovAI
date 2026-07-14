import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '../lib/hooks/useSession';

export default function Index() {
  const { session, role, isLoading } = useSession();

  if (isLoading) {
    return <View className="flex-1 bg-background" />;
  }

  if (session) {
    return <Redirect href={role === 'doctor' ? '/(doctor)/dashboard' : '/(patient)/home'} />;
  }

  return <Redirect href="/splash" />;
}
