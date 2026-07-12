import { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ComingSoonScreenProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tabBar: ReactNode;
}

/** Placeholder for screens not yet built — keeps the tab bar's active state honest instead of silently redirecting elsewhere. */
export function ComingSoonScreen({ title, icon, tabBar }: ComingSoonScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface">
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
        <Text className="text-lg font-bold text-text-dark">{title}</Text>
        <Text className="mt-1 text-center text-sm text-text-muted">Coming soon.</Text>
      </View>
      {tabBar}
    </SafeAreaView>
  );
}
