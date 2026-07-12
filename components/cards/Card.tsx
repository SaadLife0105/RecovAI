import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  title?: string;
  subtitle?: string;
}

/** Generic rounded card container shared by the stat/progress/recap cards. */
export function Card({ title, subtitle, children, className, ...rest }: CardProps) {
  return (
    <View className={`rounded-2xl bg-card p-4 ${className ?? ''}`} {...rest}>
      {title ? <Text className="text-sm font-semibold text-text-dark">{title}</Text> : null}
      {subtitle ? <Text className="mb-2 text-xs text-text-muted">{subtitle}</Text> : null}
      {children}
    </View>
  );
}
