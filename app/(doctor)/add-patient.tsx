import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/theme';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { DrugClass, DRUG_CLASS_LABELS } from '../../lib/types';
import { formatDateLabel } from '../../lib/formatDate';
import { supabase } from '../../lib/supabase';

const DRUG_CLASS_ORDER: DrugClass[] = [
  'cannabis',
  'synthetic_cannabinoids',
  'heroin_opioids',
  'stimulants',
  'sedatives_benzo',
  'other_polydrug',
];

/** Screen 11 — Doctor Add Patient. Calls the create-patient Edge Function. */
export default function AddPatient() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<DrugClass[]>([]);
  const [primaryClass, setPrimaryClass] = useState<DrugClass | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required';
    if (!/^[a-z0-9_.]{3,32}$/.test(username.trim().toLowerCase())) {
      return 'Username must be 3-32 characters: letters, numbers, underscore, or dot';
    }
    // Permissive shape check — the server re-validates and re-checks the match.
    if (!/^\S+@\S+\.\S+$/.test(patientEmail.trim())) return 'Please enter a valid patient email';
    if (patientEmail.trim() !== confirmEmail.trim()) return "Emails don't match";
    if (tempPassword.length < 8) return 'Password must be at least 8 characters';
    if (tempPassword !== confirmPassword) return "Passwords don't match";
    if (!startDate) return 'Please select a start date';
    if (selectedClasses.length === 0) return 'Please select at least one drug class';
    return null;
  };

  // Builds the date string from local wall-clock fields, not toISOString()
  // (which converts to UTC first — for Mauritius, UTC+4, that can shift
  // a locally-picked midnight back to the previous day).
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCreatePatient = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { data, error } = await supabase.functions.invoke('create-patient', {
      body: {
        fullName,
        username: username.trim().toLowerCase(),
        patientEmail: patientEmail.trim(),
        patientEmailConfirm: confirmEmail.trim(),
        password: tempPassword,
        startDate: toLocalDateString(startDate!),
        drugClasses: selectedClasses.map((c) => ({ drugClass: c, isPrimary: c === primaryClass })),
      },
    });

    if (error || data?.error) {
      setErrorMessage(data?.error ?? error!.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    Alert.alert(
      'Patient created',
      `Username: ${data.username}\n\nMake sure to relay these credentials to the patient.`,
      [{ text: 'OK', onPress: () => router.replace('/(doctor)/dashboard') }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="mb-2 mt-2 h-9 w-9 items-center justify-center">
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

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Patient&apos;s Email</Text>
          <TextInput
            value={patientEmail}
            onChangeText={setPatientEmail}
            placeholder="Enter patient's email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Confirm Email</Text>
          <TextInput
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="Re-enter patient's email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
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
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable
              onPress={() => setShowTempPassword((v) => !v)}
              accessibilityLabel={showTempPassword ? 'Hide temporary password' : 'Show temporary password'}
              hitSlop={12}
            >
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
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-text-dark"
            />
            <Pressable
              onPress={() => setShowConfirmPassword((v) => !v)}
              accessibilityLabel={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              hitSlop={12}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Start Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3"
          >
            {startDate ? (
              <Text className="text-sm text-text-dark">{formatDateLabel(toLocalDateString(startDate))}</Text>
            ) : (
              <Text className="text-sm" style={{ color: colors.textMuted }}>Select start date</Text>
            )}
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={startDate ?? new Date()}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) setStartDate(selected);
              }}
            />
          )}

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

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            onPress={handleCreatePatient}
            disabled={isSubmitting}
            className="mt-8 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? 'Creating...' : 'Create Patient'}
            </Text>
          </Pressable>
        </ScrollView>

        <DoctorTabBar active="dashboard" />
      </View>
    </SafeAreaView>
  );
}
