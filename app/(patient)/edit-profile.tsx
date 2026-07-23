import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/theme';
import { usePatientProfile } from '../../lib/hooks/usePatientProfile';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { useToast } from '../../components/toast/ToastProvider';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { formatDateLabel } from '../../lib/formatDate';

// Same reasoning as add-patient.tsx's copy: builds the date string from local
// wall-clock fields, not toISOString() (which converts to UTC first — for
// Mauritius, UTC+4, that can shift a locally-picked midnight to the day before).
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Patient Edit Profile — reached from profile.tsx's "Edit Profile" row. Persists to `profiles`. */
export default function EditProfile() {
  const router = useRouter();
  const { session } = useSession();
  const { data: profile, isLoading } = usePatientProfile();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // usePatientProfile resolves async, so seeding these in useState's
  // initializer would capture the null first render forever and Save would
  // write empty strings over real values. Hydrate once, after the fetch lands
  // — same guard as edit-note.tsx uses for the doctor's note.
  useEffect(() => {
    if (isLoading || hasHydrated || !profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setEmail(profile.contactEmail ?? '');
    // A date-only column: parsed with an explicit T00:00:00 so it is read as
    // local midnight rather than UTC midnight, which would render as the
    // previous day in Mauritius.
    setDateOfBirth(profile.dateOfBirth ? new Date(`${profile.dateOfBirth}T00:00:00`) : null);
    setHasHydrated(true);
  }, [isLoading, hasHydrated, profile]);

  const handleSave = async () => {
    const patientId = session?.user.id;
    if (!patientId || !hasHydrated) return;

    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        contact_email: email.trim() || null,
        date_of_birth: dateOfBirth ? toLocalDateString(dateOfBirth) : null,
      })
      .eq('id', patientId);

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    // Keep the patient's Auth identity email in step with their contact_email,
    // so a real email here also becomes what they log in / reset with (see
    // sync-patient-login-email). Only when non-empty — blanking it back out is
    // deliberately NOT reverted to the synthetic address (out of scope).
    // Best-effort: the profile row already saved, so a sync hiccup shouldn't
    // fail the whole Save.
    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 0) {
      const { error: syncError } = await supabase.functions.invoke('sync-patient-login-email', {
        body: { email: trimmedEmail },
      });
      if (syncError) console.warn('Could not sync login email:', syncError.message);
    }

    setIsSubmitting(false);
    showToast('Profile updated.', 'success');
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8} className="h-9 w-9 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-lg font-bold text-text-dark">Edit Profile</Text>
            <Pressable onPress={handleSave} disabled={isSubmitting || !hasHydrated} className="h-9 items-center justify-center">
              <Text
                className="text-base font-semibold"
                style={{ color: isSubmitting || !hasHydrated ? colors.textMuted : colors.primary }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <Text className="mb-1 mt-6 text-sm font-medium text-text-dark">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Date of Birth</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3"
          >
            {dateOfBirth ? (
              <Text className="text-sm text-text-dark">{formatDateLabel(toLocalDateString(dateOfBirth))}</Text>
            ) : (
              <Text className="text-sm" style={{ color: colors.textMuted }}>Select your date of birth</Text>
            )}
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth ?? new Date()}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) setDateOfBirth(selected);
              }}
            />
          )}

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />
          <Text className="mt-1 text-xs text-text-muted">
            Used to reach you about your account. You still sign in with your username.
          </Text>

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
