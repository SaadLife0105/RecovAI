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

// End-of-track anchors so "1" and "10" have an obvious, honest meaning —
// mood/sleep are better-at-10, craving is worse-at-10, so the icons
// deliberately differ in kind (mood: distinct faces) vs intensity
// (sleep/craving: same symbol, outline vs solid) to match that.
const LOW_ICON: Record<'mood' | 'sleep' | 'craving', keyof typeof Ionicons.glyphMap> = {
  mood: 'sad-outline',
  sleep: 'moon-outline',
  craving: 'flame-outline',
};

const HIGH_ICON: Record<'mood' | 'sleep' | 'craving', keyof typeof Ionicons.glyphMap> = {
  mood: 'happy-outline',
  sleep: 'moon',
  craving: 'flame',
};

const LOW_TEXT: Record<'mood' | 'sleep' | 'craving', string> = {
  mood: 'Low mood',
  sleep: 'Poor sleep',
  craving: 'No urge',
};

const HIGH_TEXT: Record<'mood' | 'sleep' | 'craving', string> = {
  mood: 'Great mood',
  sleep: 'Great sleep',
  craving: 'Intense urge',
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
        <View className="mt-1 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name={LOW_ICON[type]} size={14} color={colors.textMuted} />
            <Text className="ml-1 text-[11px] text-text-muted">{LOW_TEXT[type]}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="mr-1 text-[11px] text-text-muted">{HIGH_TEXT[type]}</Text>
            <Ionicons name={HIGH_ICON[type]} size={14} color={colors.textMuted} />
          </View>
        </View>
      </View>
      <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-surface">
        <Ionicons name={ICONS[type]} size={18} color={colors.primary} />
      </View>
    </View>
  );
}
