import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { SOSButton } from '../../components/sos/SOSButton';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { DrugClass, DRUG_CLASS_LABELS } from '../../lib/types';

const DRUG_CLASS_ORDER: DrugClass[] = [
  'cannabis',
  'synthetic_cannabinoids',
  'heroin_opioids',
  'stimulants',
  'sedatives_benzo',
  'other_polydrug',
];

/** Screen 11 — Doctor Add Patient. Static UI; account creation is wired in a later phase. */
export default function AddPatient() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<DrugClass[]>([]);
  const [primaryClass, setPrimaryClass] = useState<DrugClass | null>(null);

  const toggleClass = (drugClass: DrugClass) => {
    if (!selectedClasses.includes(drugClass)) {
      const wasEmpty = selectedClasses.length === 0;
      setSelectedClasses([...selectedClasses, drugClass]);
      if (wasEmpty) setPrimaryClass(drugClass);
      return;
    }
    const remaining = selectedClasses.filter((c) => c !== drugClass);
    setSelectedClasses(remaining);
    if (primaryClass === drugClass) {
      setPrimaryClass(remaining[0] ?? null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} className="mb-2 mt-2 h-9 w-9 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.textDark} />
          </Pressable>

          <Text className="text-2xl font-bold text-text-dark">Add New Patient</Text>

          <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Temporary Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
            <TextInput
              value={tempPassword}
              onChangeText={setTempPassword}
              placeholder="Enter temporary password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showTempPassword}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable onPress={() => setShowTempPassword((v) => !v)}>
              <Ionicons name={showTempPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Confirm Password</Text>
          <View className="flex-row items-center rounded-xl bg-card px-4">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm temporary password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Start Date</Text>
          <View className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3">
            <Text className="text-sm" style={{ color: colors.textMuted }}>Select start date</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Drug Class</Text>
          <Text className="mb-2 text-xs" style={{ color: colors.textMuted }}>Select one or more. Mark one as primary.</Text>
          <View className="flex-row flex-wrap gap-2">
            {DRUG_CLASS_ORDER.map((drugClass) => {
              const isSelected = selectedClasses.includes(drugClass);
              const isPrimary = primaryClass === drugClass;
              return (
                <Pressable
                  key={drugClass}
                  onPress={() => toggleClass(drugClass)}
                  className="w-[48%] flex-row items-center justify-center rounded-xl border px-3 py-2"
                  style={{
                    backgroundColor: isPrimary ? colors.primary : colors.card,
                    borderColor: isPrimary ? colors.primary : isSelected ? colors.primary : colors.divider,
                  }}
                >
                  {isPrimary && <Ionicons name="star" size={14} color="white" style={{ marginRight: 4 }} />}
                  <Text
                    className="text-center text-sm"
                    style={{ color: isPrimary ? 'white' : isSelected ? colors.primary : colors.textDark }}
                  >
                    {DRUG_CLASS_LABELS[drugClass]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedClasses.length > 1 && (
            <View className="mt-2 flex-row flex-wrap gap-3">
              {selectedClasses
                .filter((c) => c !== primaryClass)
                .map((drugClass) => (
                  <Pressable key={drugClass} onPress={() => setPrimaryClass(drugClass)}>
                    <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                      Make {DRUG_CLASS_LABELS[drugClass]} primary
                    </Text>
                  </Pressable>
                ))}
            </View>
          )}

          <Pressable
            onPress={() => router.push('/(doctor)/dashboard')}
            className="mt-8 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-base font-semibold text-white">Create Patient</Text>
          </Pressable>
        </ScrollView>

        <SOSButton />

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
