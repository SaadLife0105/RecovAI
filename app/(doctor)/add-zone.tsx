import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Svg, { Line } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { ZONE_TYPE_META } from '../../lib/zoneTypes';

const ZONE_TYPES = Object.values(ZONE_TYPE_META).map(({ label, color }) => ({ label, color }));

// Static grid lines standing in for a real map tile — no interactive map integration yet (see docs/Development Plan.md §3.4)
function MapGridBackground() {
  const lines = [40, 90, 140, 190];
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      {lines.map((y) => (
        <Line key={`h${y}`} x1="0" y1={y} x2="100%" y2={y} stroke={colors.divider} strokeWidth={1} />
      ))}
      {lines.map((x) => (
        <Line key={`v${x}`} x1={x} y1="0" x2={x} y2="100%" stroke={colors.divider} strokeWidth={1} />
      ))}
    </Svg>
  );
}

/** Screen 17/38 — Risk Zone Management. Static UI; map is a placeholder, not a real react-native-maps integration. */
export default function AddZone() {
  const router = useRouter();
  const [selectedZoneType, setSelectedZoneType] = useState(ZONE_TYPES[0].label);
  const [radius, setRadius] = useState(300);
  const [status, setStatus] = useState<'safe' | 'risk'>('safe');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Risk Zone Management</Text>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Zone Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {ZONE_TYPES.map((zoneType) => {
              const isSelected = zoneType.label === selectedZoneType;
              return (
                <Pressable
                  key={zoneType.label}
                  onPress={() => setSelectedZoneType(zoneType.label)}
                  className="flex-row items-center rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: zoneType.color,
                    width: '31.5%',
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: colors.textDark,
                  }}
                >
                  <Text className="flex-1 text-xs font-semibold text-white" numberOfLines={1}>
                    {zoneType.label}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Pin on Map</Text>
          <View className="h-44 overflow-hidden rounded-2xl bg-surface">
            <MapGridBackground />
            <View className="flex-1 items-center justify-center">
              <Ionicons name="location" size={36} color={colors.primary} />
            </View>
            <Pressable
              className="absolute bottom-3 self-center rounded-full px-4 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xs font-semibold text-white">Pin on Map</Text>
            </Pressable>
            <Text className="absolute bottom-2 left-3 text-[10px] text-text-muted">Google</Text>
            <Text className="absolute bottom-2 right-3 text-[10px] text-text-muted">Map data ©2025</Text>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Coordinates (Auto-filled)</Text>
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
            <Text className="text-sm text-text-dark">-20.1531, 57.5016</Text>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Radius: {radius}m</Text>
          <View className="flex-row items-center">
            <Slider
              style={{ flex: 1 }}
              minimumValue={100}
              maximumValue={1000}
              step={10}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.divider}
              thumbTintColor={colors.primary}
            />
            <View className="ml-3 rounded-lg bg-card px-3 py-2">
              <Text className="text-sm font-semibold text-text-dark">{radius} m</Text>
            </View>
          </View>

          <Text className="mb-2 mt-5 text-sm font-medium text-text-dark">Zone Status</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setStatus('safe')}
              className="flex-1 flex-row items-center justify-center rounded-xl border-2 py-3"
              style={{
                borderColor: status === 'safe' ? colors.riskLow : colors.divider,
                backgroundColor: status === 'safe' ? colors.riskLowBg : colors.card,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.riskLowText} />
              <Text className="ml-2 text-sm font-semibold" style={{ color: colors.riskLowText }}>
                Safe Zone
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus('risk')}
              className="flex-1 flex-row items-center justify-center rounded-xl border-2 py-3"
              style={{
                borderColor: status === 'risk' ? colors.riskHigh : colors.divider,
                backgroundColor: status === 'risk' ? colors.riskHighBg : colors.card,
              }}
            >
              <Ionicons name="warning" size={16} color={colors.riskHighText} />
              <Text className="ml-2 text-sm font-semibold" style={{ color: colors.riskHighText }}>
                Risk Zone
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/(doctor)/zones')}
            className="mt-6 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Save Zone</Text>
          </Pressable>
        </ScrollView>

        <SOSButton />
      </View>
    </SafeAreaView>
  );
}
