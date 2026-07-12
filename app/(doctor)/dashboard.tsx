import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { PatientListRow } from '../../components/cards/PatientListRow';
import { PatientListSkeleton } from '../../components/skeletons/PatientListSkeleton';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { usePatients } from '../../lib/hooks/usePatients';

const FILTERS = ['All', 'High Risk', 'Medium Risk', 'Low Risk', 'Inactive', 'Pending', 'Archived'];

// DEV-ONLY: usePatients().isLoading is always false right now (no real
// async fetch exists yet). Flip this to true locally to preview
// PatientListSkeleton — remove once real loading states exist.
const DEV_FORCE_LOADING = false;

/** Screen 10 — Doctor Dashboard ("Mission Control"). Static UI; filter chips and search are visual only. */
export default function DoctorDashboard() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const { data, isLoading } = usePatients();
  const loading = isLoading || DEV_FORCE_LOADING;

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
              placeholder="Search patients..."
              placeholderTextColor={colors.textMuted}
              className="ml-2 flex-1 text-sm text-text-dark"
            />
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
            data.patients.map((patient) => (
              <PatientListRow
                key={patient.name}
                {...patient}
                onPress={() => router.push({ pathname: '/(doctor)/patient/[id]', params: { id: '1' } })}
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
