import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from '../../lib/hooks/useSession';
import { registerPushTokenAsync } from '../../lib/registerPushToken';

export default function DoctorLayout() {
  const { session, role } = useSession();
  const doctorId = role === 'doctor' ? session?.user.id : undefined;

  useEffect(() => {
    if (doctorId) registerPushTokenAsync(doctorId);
  }, [doctorId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
