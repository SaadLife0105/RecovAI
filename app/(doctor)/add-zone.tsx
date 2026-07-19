import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { ZONE_TYPE_META } from '../../lib/zoneTypes';
import { createRiskZone } from '../../lib/hooks/useRiskZones';

const ZONE_TYPES = Object.entries(ZONE_TYPE_META).map(([key, { label, color }]) => ({ key, label, color }));

type ZoneStatus = 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';

// 4-level danger gradient (riskLow→moodOkay→riskMedium→riskHigh) — matches the
// patient-facing zone chip on home.tsx so the doctor's creation UI previews
// what the patient will eventually see.
const ZONE_STATUS_OPTIONS: { key: ZoneStatus; label: string; color: string; bg: string }[] = [
  { key: 'safe', label: 'Safe', color: colors.riskLow, bg: colors.riskLowBg },
  { key: 'low_risk', label: 'Low Risk', color: colors.moodOkay, bg: colors.moodOkayBg },
  { key: 'medium_risk', label: 'Medium Risk', color: colors.riskMedium, bg: colors.riskMediumBg },
  { key: 'high_risk', label: 'High Risk', color: colors.riskHigh, bg: colors.riskHighBg },
];

// Mauritius fallback region when we can't get the doctor's location.
const MAURITIUS_REGION: Region = {
  latitude: -20.348404,
  longitude: 57.552152,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

/** Screen 17/38 — Risk Zone Management. Real map + save. */
export default function AddZone() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName: string }>();
  const [selectedZoneType, setSelectedZoneType] = useState<string | null>(null);
  const [radius, setRadius] = useState(300);
  const [status, setStatus] = useState<ZoneStatus>('safe');
  const [label, setLabel] = useState('');
  const [region, setRegion] = useState<Region>(MAURITIUS_REGION);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // On mount, center on the doctor's current location and drop an initial
  // marker there (they're often at/near the place they're flagging). If
  // permission is denied/unavailable, fall back to Mauritius with no marker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync();
        if (cancelled) return;
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setRegion({ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        setMarker(coord);
      } catch {
        // keep Mauritius fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusMeta = ZONE_STATUS_OPTIONS.find((o) => o.key === status)!;

  const validate = (): string | null => {
    if (!label.trim()) return 'Zone label is required';
    if (!marker) return 'Tap the map to place a pin';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await createRiskZone({
      patientId,
      lat: marker!.latitude,
      lng: marker!.longitude,
      radiusM: radius,
      zoneType: selectedZoneType ?? null,
      classification: status,
      label: label.trim(),
    });

    if (error) {
      setErrorMessage(error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    // router.back() rather than push — this screen is always reached from an
    // existing Zones screen already on the stack (Patient Detail -> Zones ->
    // Add Zone), so pushing a second Zones instance on top left a stray
    // duplicate in the stack: pressing back (in-app or the phone's own back
    // button, which follows this same stack) landed back on Add Zone instead
    // of Patient Detail.
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-2 h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-text-dark">Risk Zone Management</Text>
              <Text className="text-xs text-text-muted">{patientName}</Text>
            </View>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Zone Type (optional)</Text>
          <View className="flex-row flex-wrap gap-2">
            {ZONE_TYPES.map((zoneType) => {
              const isSelected = zoneType.key === selectedZoneType;
              return (
                <Pressable
                  key={zoneType.key}
                  // Tapping the selected type again clears it back to no selection.
                  onPress={() => setSelectedZoneType(isSelected ? null : zoneType.key)}
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

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Zone Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Le Caudan Nightclub"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Pin on Map</Text>
          <View className="overflow-hidden rounded-2xl">
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ height: 260 }}
              region={region}
              onPress={(e) => setMarker(e.nativeEvent.coordinate)}
            >
              {marker ? (
                <>
                  <Marker
                    coordinate={marker}
                    draggable
                    onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)}
                  />
                  <Circle
                    center={marker}
                    radius={radius}
                    fillColor={statusMeta.bg + '80'}
                    strokeColor={statusMeta.color}
                  />
                </>
              ) : null}
            </MapView>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Coordinates</Text>
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
            <Text className="text-sm" style={{ color: marker ? colors.textDark : colors.textMuted }}>
              {marker ? `${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}` : 'Tap the map to place a pin'}
            </Text>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Radius: {radius}m</Text>
          <View className="flex-row items-center">
            <Slider
              style={{ flex: 1 }}
              minimumValue={50}
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
          <View className="flex-row gap-2">
            {ZONE_STATUS_OPTIONS.map((option) => {
              const isSelected = option.key === status;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setStatus(option.key)}
                  className="flex-1 items-center justify-center rounded-xl border-2 py-3"
                  style={{
                    borderColor: isSelected ? option.color : colors.divider,
                    backgroundColor: isSelected ? option.bg : colors.card,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    numberOfLines={1}
                    style={{ color: isSelected ? option.color : colors.textMuted }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            className="mt-6 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">{isSubmitting ? 'Saving...' : 'Save Zone'}</Text>
          </Pressable>
        </ScrollView>

        <SOSButton />
      </View>
    </SafeAreaView>
  );
}
