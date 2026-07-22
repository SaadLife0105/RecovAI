import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { EmptyStateCard } from '../../components/cards/EmptyStateCard';
import { useToast } from '../../components/toast/ToastProvider';
import { useRiskZones, deleteRiskZone } from '../../lib/hooks/useRiskZones';
import { ZONE_TYPE_META } from '../../lib/zoneTypes';

// 4-level classification gradient (riskLow→moodOkay→riskMedium→riskHigh) —
// matches the patient-facing zone chip and the add-zone selector.
const ZONE_STATUS_META: Record<
  'safe' | 'low_risk' | 'medium_risk' | 'high_risk',
  { label: string; color: string; bg: string }
> = {
  // `color` is the chip's TEXT color, so it uses the *Text tokens, not the
  // vivid band/dot tokens: riskMedium on riskMediumBg measured 2.07:1 and
  // moodOkay on moodOkayBg 1.85:1, far under AA. The *Text pairs all clear it.
  safe: { label: 'Safe', color: colors.riskLowText, bg: colors.riskLowBg },
  low_risk: { label: 'Low Risk', color: colors.moodOkayText, bg: colors.moodOkayBg },
  medium_risk: { label: 'Medium Risk', color: colors.riskMediumText, bg: colors.riskMediumBg },
  high_risk: { label: 'High Risk', color: colors.riskHighText, bg: colors.riskHighBg },
};

/** Screen 12 — Risk Zones (Doctor). Scoped to one patient; zone add/delete lands here in Phase 3.4. */
export default function RiskZones() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName: string }>();
  const { data: zones, refetch } = useRiskZones(patientId);
  const { showToast } = useToast();

  const confirmDelete = (zoneId: string) => {
    Alert.alert('Delete this zone?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // The error was discarded entirely: a failed delete refetched an
          // unchanged list, so the zone silently stayed put with no message.
          const { error } = await deleteRiskZone(zoneId);
          if (error) showToast("Couldn't delete this zone. Please try again.");
          refetch();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <View className="items-center">
              <Text className="text-xl font-bold text-text-dark">Risk Zones</Text>
              <Text className="text-xs text-text-muted">{patientName}</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/(doctor)/add-zone', params: { patientId, patientName } })}
              accessibilityLabel="Add a risk zone"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center"
            >
              <Ionicons name="add" size={24} color={colors.textDark} />
            </Pressable>
          </View>

          {zones.length === 0 ? (
            <View className="mt-6">
              <EmptyStateCard
                illustration={require('../../assets/illustrations/18-map-with-circular-geofence-around-pin.png')}
                title="No zones yet"
                subtitle="Add risk or safe zones to help detect when this patient enters an area of concern."
              />
            </View>
          ) : (
            <>
              <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Your Zones</Text>
              {zones.map((zone) => {
                // zone_type is now optional — omit the type icon when absent
                // (the label is the primary identifier), rather than a fallback.
                const typeMeta = zone.zoneType ? ZONE_TYPE_META[zone.zoneType] : null;
                const statusMeta = ZONE_STATUS_META[zone.classification];
                return (
                  <View key={zone.id} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
                    {typeMeta ? (
                      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: typeMeta.bg }}>
                        <Ionicons name={typeMeta.icon} size={18} color={typeMeta.color} />
                      </View>
                    ) : null}
                    <View className={`flex-1 ${typeMeta ? 'ml-3' : ''}`}>
                      <Text className="text-sm font-semibold text-text-dark">{zone.label}</Text>
                      <View className="mt-1 flex-row items-center">
                        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusMeta.bg }}>
                          <Text className="text-[11px] font-semibold" style={{ color: statusMeta.color }}>
                            {statusMeta.label}
                          </Text>
                        </View>
                        <Text className="ml-2 text-xs text-text-muted">Radius: {zone.radiusM}m</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => confirmDelete(zone.id)}
                      accessibilityLabel={`Delete zone ${zone.label}`}
                      hitSlop={8}
                      className="h-9 w-9 items-center justify-center"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}

          <Pressable
            onPress={() => router.push({ pathname: '/(doctor)/add-zone', params: { patientId, patientName } })}
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
