import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useRiskZones } from '../../lib/hooks/useRiskZones';
import { ZONE_TYPE_META } from '../../lib/zoneTypes';

/** Screen 12 — Risk Zones (Doctor). Zone CRUD (add/edit/delete) still lands in Phase 3.4 (see docs/Development Plan.md) — this list is read-only. */
export default function RiskZones() {
  const router = useRouter();
  const { data: zones } = useRiskZones();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-xl font-bold text-text-dark">Risk Zones</Text>
            <Pressable className="h-9 w-9 items-center justify-center">
              <Ionicons name="add" size={24} color={colors.textDark} />
            </Pressable>
          </View>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Your Zones</Text>
          {zones.map((zone) => {
            const meta = ZONE_TYPE_META[zone.zoneType];
            return (
              <View key={zone.id} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-text-dark">{zone.label}</Text>
                  <Text className="mt-0.5 text-xs text-text-muted">Radius: {zone.radiusM}m</Text>
                </View>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </View>
            );
          })}

          <Pressable
            onPress={() => router.push('/(doctor)/add-zone')}
            className="mt-2 items-center rounded-2xl border-2 py-4"
            style={{ borderColor: colors.secondary }}
          >
            <Text className="text-base font-semibold" style={{ color: colors.secondary }}>
              Add New Zone
            </Text>
          </Pressable>
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
