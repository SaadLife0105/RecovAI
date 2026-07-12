import { View, Text, Image, ImageSourcePropType } from 'react-native';

interface EmptyStateCardProps {
  illustration: ImageSourcePropType;
  title: string;
  subtitle: string;
}

/** Centered illustration + title + subtitle card — end-of-list / empty states (Alerts "All clear", Reports "No reports yet"). */
export function EmptyStateCard({ illustration, title, subtitle }: EmptyStateCardProps) {
  return (
    <View className="items-center rounded-2xl bg-card p-6">
      <Image source={illustration} style={{ width: 64, height: 64 }} resizeMode="contain" />
      <Text className="mt-3 text-base font-bold text-text-dark">{title}</Text>
      <Text className="mt-1 text-center text-sm text-text-muted">{subtitle}</Text>
    </View>
  );
}
