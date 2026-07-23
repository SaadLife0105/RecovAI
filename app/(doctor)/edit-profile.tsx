import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { DoctorTabBar } from '../../components/navigation/DoctorTabBar';
import { useToast } from '../../components/toast/ToastProvider';
import { useDoctorProfile } from '../../lib/hooks/useDoctorProfile';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';

/**
 * Doctor Edit Profile — reached from profile.tsx's "Edit Profile" row.
 *
 * Scoped to what a doctor actually owns here: name and phone. No DOB (not a
 * clinical field for the doctor themselves), no email field (a doctor's email
 * is their Supabase Auth identity, changed through Auth rather than this
 * table), no photo (the avatar is a fixed illustration).
 */
export default function DoctorEditProfile() {
  const router = useRouter();
  const { session } = useSession();
  const { data: profile, isLoading } = useDoctorProfile();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hydrate once after the async fetch resolves — seeding useState's
  // initializer would capture the null first render and Save would then blank
  // out real values. Same guard as the patient edit screen.
  useEffect(() => {
    if (isLoading || hasHydrated || !profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setHasHydrated(true);
  }, [isLoading, hasHydrated, profile]);

  const handleSave = async () => {
    const doctorId = session?.user.id;
    if (!doctorId || !hasHydrated) return;

    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', doctorId);

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
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
                style={{ color: isSubmitting || !hasHydrated ? colors.textMuted : colors.secondary }}
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

          <Text className="mb-1 mt-5 text-sm font-medium text-text-dark">Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            className="rounded-xl bg-card px-4 py-3 text-text-dark"
          />
          <Text className="mt-1 text-xs text-text-muted">
            Shown to your assigned patients so they can reach you. Leave it blank to keep it hidden.
          </Text>

          {errorMessage && (
            <Text className="mt-4 text-center text-sm" style={{ color: colors.riskHigh }}>
              {errorMessage}
            </Text>
          )}
        </ScrollView>

        <DoctorTabBar active="profile" />
      </View>
    </SafeAreaView>
  );
}
