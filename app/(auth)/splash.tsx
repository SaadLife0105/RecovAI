import { useEffect } from 'react';
import { View, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../constants/theme';

/** Screen 1 — Splash: brand logo over a wavy teal gradient, auto-advances to role select. */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/role-select'), 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Pressable
      className="flex-1 items-center justify-center bg-white"
      onPress={() => router.replace('/role-select')}
    >
      <View className="absolute bottom-0 left-0 right-0">
        <Svg width="100%" height={420} viewBox="0 0 400 420" preserveAspectRatio="none">
          <Path
            d="M0,120 C100,180 300,60 400,140 L400,420 L0,420 Z"
            fill={colors.primary}
            opacity={0.18}
          />
          <Path
            d="M0,200 C120,260 280,140 400,220 L400,420 L0,420 Z"
            fill={colors.primary}
            opacity={0.35}
          />
          <Path
            d="M0,300 C130,340 270,240 400,300 L400,420 L0,420 Z"
            fill={colors.primary}
          />
        </Svg>
      </View>
      <Image source={require('../../assets/logo.png')} style={{ width: 160, height: 160 }} resizeMode="contain" />
    </Pressable>
  );
}
