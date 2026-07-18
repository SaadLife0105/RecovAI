import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from '../../lib/hooks/useSession';
import { PassiveDataProvider } from '../../lib/context/PassiveDataContext';
import { registerBackgroundLocationTaskAsync } from '../../lib/backgroundLocationTask';

export default function PatientLayout() {
  const { session } = useSession();
  const patientId = session?.user.id;

  useEffect(() => {
    if (patientId) {
      registerBackgroundLocationTaskAsync().then((granted) => {
        if (!granted)
          console.warn('Background location permission denied — zone_breaches will only log while the app is open.');
      });
    }
  }, [patientId]);

  return (
    <PassiveDataProvider patientId={patientId}>
      <Stack screenOptions={{ headerShown: false }} />
    </PassiveDataProvider>
  );
}
