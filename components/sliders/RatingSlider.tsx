import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

const ICONS: Record<'mood' | 'sleep' | 'craving', keyof typeof Ionicons.glyphMap> = {
  mood: 'happy-outline',
  sleep: 'moon-outline',
  craving: 'flame-outline',
};

const LABELS: Record<'mood' | 'sleep' | 'craving', string> = {
  mood: 'Mood',
  sleep: 'Sleep',
  craving: 'Craving',
};

interface RatingSliderProps {
  type: 'mood' | 'sleep' | 'craving';
  value: number;
  onValueChange?: (value: number) => void;
  readOnly?: boolean;
}

/** Mood/Sleep/Craving 1–10 slider with an icon badge. Read-only for recap views (no live risk preview). */
export function RatingSlider({ type, value, onValueChange, readOnly }: RatingSliderProps) {
  return (
    <View className="mb-4 flex-row items-center">
      <View className="flex-1">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-text-dark">{LABELS[type]}</Text>
          <Text className="text-sm font-semibold text-text-dark">{value}</Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onValueChange}
          disabled={readOnly}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.divider}
          thumbTintColor={colors.primary}
        />
      </View>
      <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-surface">
        <Ionicons name={ICONS[type]} size={18} color={colors.primary} />
      </View>
    </View>
  );
}
