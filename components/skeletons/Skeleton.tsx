import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { colors } from '../../constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  circle?: boolean;
}

/** Reusable pulsing placeholder block — composes into every skeleton layout instead of one-off shapes per screen. */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, circle = false }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? height / 2 : borderRadius,
        backgroundColor: colors.divider,
        opacity,
      }}
    />
  );
}
