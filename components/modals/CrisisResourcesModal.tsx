import { View, Text, Pressable, Image, Modal, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface Contact {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
  number: string;
}

// Exact contacts from the mockup — do not alter or invent contact information.
const CONTACTS: Contact[] = [
  { icon: 'call-outline', name: 'Emergency', description: 'For any medical emergency', number: '999' },
  { icon: 'medical-outline', name: 'SAMU', description: 'Ambulance / Emergency Medical Service', number: '114' },
  { icon: 'headset-outline', name: 'Addiction Helpline', description: 'Confidential support and guidance', number: '5 255 9050' },
];

interface CrisisResourcesModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Crisis Resources sheet — opened from the persistent SOSButton on every patient screen. */
export function CrisisResourcesModal({ visible, onClose }: CrisisResourcesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full rounded-3xl bg-card p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-text-dark">Crisis Resources</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close crisis resources" hitSlop={8} className="h-8 w-8 items-center justify-center">
              <Ionicons name="close" size={22} color={colors.textDark} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl p-4" style={{ backgroundColor: colors.riskHighBg }}>
            <Image source={require('../../assets/illustrations/14-lifebuoy-emergency.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold" style={{ color: colors.riskHighText }}>
                Need help right now?
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: colors.riskHighText }}>
                You are not alone. Support is available 24/7.
              </Text>
            </View>
          </View>

          <View className="mt-4">
            {CONTACTS.map((contact) => (
              <View key={contact.name} className="mb-3 flex-row items-center rounded-2xl bg-surface p-3">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.riskHighBg }}>
                  <Ionicons name={contact.icon} size={18} color={colors.riskHigh} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-text-dark">{contact.name}</Text>
                  <Text className="text-xs text-text-muted">{contact.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="mb-1 text-sm font-bold text-text-dark">{contact.number}</Text>
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${contact.number.replace(/\s/g, '')}`)}
                    className="items-center rounded-full px-3 py-1.5"
                    style={{ backgroundColor: colors.riskHigh }}
                  >
                    <Text className="text-[11px] font-bold text-white">Call Now</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={onClose} className="mt-2 items-center rounded-2xl border-2 py-3" style={{ borderColor: colors.primary }}>
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              I&apos;m okay
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
