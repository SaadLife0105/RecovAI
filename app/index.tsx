import { View, Text } from 'react-native';

// Temporary boot screen — proves the clean scaffold runs end to end
// (NativeWind classes, Expo Router, TS paths all wired). Replace with
// the real Splash screen (Screen 1) in the frontend build pass.
export default function BootCheck() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-primary">RecovAI</Text>
      <Text className="mt-2 text-text-muted">Clean scaffold — ready to build screens</Text>
    </View>
  );
}
