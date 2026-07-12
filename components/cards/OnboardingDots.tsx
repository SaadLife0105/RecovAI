import { View } from 'react-native';
import { colors } from '../../constants/theme';

/** Pagination dots for the 3-slide onboarding sequence. */
export function OnboardingDots({ total, activeIndex }: { total: number; activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className="h-2 rounded-full"
          style={{ width: i === activeIndex ? 20 : 8, backgroundColor: i === activeIndex ? colors.primary : colors.divider }}
        />
      ))}
    </View>
  );
}
