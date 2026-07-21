import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, riskBand } from '../../constants/theme';
import { PatientListRow, PatientRowData } from '../../components/cards/PatientListRow';
import { PatientListSkeleton } from '../../components/skeletons/PatientListSkeleton';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { usePatients } from '../../lib/hooks/usePatients';

const FILTERS = ['All', 'High Risk', 'Medium Risk', 'Low Risk', 'Flagged', 'Inactive', 'Pending', 'Archived'];

// DEV-ONLY: usePatients().isLoading is always false right now (no real
// async fetch exists yet). Flip this to true locally to preview
// PatientListSkeleton — remove once real loading states exist.
const DEV_FORCE_LOADING = false;

/** Screen 10 — Doctor Dashboard ("Mission Control"). Search and filter chips do real filtering over usePatients(). */
export default function DoctorDashboard() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePatients();
  const loading = isLoading || DEV_FORCE_LOADING;

  const source = activeFilter === 'Archived' ? data.archivedPatients : data.patients;
  const byFilter = (p: PatientRowData): boolean => {
    switch (activeFilter) {
      case 'High Risk':
        return p.score !== null && riskBand(p.score) === 'high';
      case 'Medium Risk':
        return p.score !== null && riskBand(p.score) === 'medium';
      case 'Low Risk':
        return p.score !== null && riskBand(p.score) === 'low';
      case 'Flagged':
        return p.flagged === true;
      case 'Inactive':
        return p.lastCheckInDaysAgo !== undefined && p.lastCheckInDaysAgo >= 7;
      case 'Pending':
        return p.notLoggedIn === true;
      default: // 'All' and 'Archived' (source already narrowed)
        return true;
    }
  };
  const query = search.trim().toLowerCase();
  const visiblePatients = source.filter(
    (p) =>
      byFilter(p) &&
      (query === '' || p.name.toLowerCase().includes(query) || p.patientId.toLowerCase().includes(query)),
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Ionicons name="menu-outline" size={24} color={colors.textDark} />
            <Text className="text-2xl font-bold text-text-dark">Mission Control</Text>
            <View>
              <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
              <View
                className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border"
                style={{ backgroundColor: colors.riskHigh, borderColor: colors.background }}
              />
            </View>
          </View>

          <View className="mt-4 flex-row items-center rounded-xl bg-card px-4 py-3">
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patients..."
              placeholderTextColor={colors.textMuted}
              className="ml-2 flex-1 text-sm text-text-dark"
            />
          </View>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">Total Patients</Text>
              <Text className="mt-1 text-2xl font-bold text-text-dark">{data.totalPatients}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">High Risk Now</Text>
              <Text className="mt-1 text-2xl font-bold" style={{ color: colors.riskHighText }}>
                {data.highRisk}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-card p-4">
              <Text className="text-xs text-text-muted">Predicted High Risk (48h)</Text>
              <Text className="mt-1 text-2xl font-bold" style={{ color: colors.riskMediumText }}>
                {data.predictedHighRisk}
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mx-5 px-5">
            <View className="flex-row gap-2">
              {FILTERS.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    className="rounded-full border px-4 py-2"
                    style={{
                      backgroundColor: isActive ? colors.secondary : colors.card,
                      borderColor: isActive ? colors.secondary : colors.divider,
                    }}
                  >
                    <Text className="text-xs font-medium" style={{ color: isActive ? '#FFFFFF' : colors.textDark }}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text className="mb-2 mt-6 text-sm font-semibold text-text-dark">Patients (Sorted by current risk)</Text>
          {loading ? (
            <PatientListSkeleton />
          ) : (
            visiblePatients.map((patient) => (
              <PatientListRow
                key={patient.id}
                {...patient}
                onPress={() => router.push({ pathname: '/(doctor)/patient/[id]', params: { id: patient.id } })}
              />
            ))
          )}
        </ScrollView>

        <Pressable
          onPress={() => router.push('/(doctor)/add-patient')}
          className="absolute bottom-52 right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <Ionicons name="person-add" size={22} color="#FFFFFF" />
        </Pressable>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
