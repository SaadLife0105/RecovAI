import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { Skeleton } from './Skeleton';

/**
 * Loading placeholder for a future populated chat.tsx — built per the
 * established pattern but intentionally NOT wired anywhere yet: no chat
 * data hook exists (see docs/Known-Issues.md #8), so there's nothing to
 * key loading state off of. Safe to preview by rendering it directly.
 */
export function ChatSkeleton() {
  return (
    <View className="flex-1 px-5 pt-4">
      <View className="mb-4 flex-row items-end">
        <Skeleton circle height={32} />
        <View className="ml-2">
          <Skeleton width={160} height={36} borderRadius={16} />
        </View>
      </View>

      <View className="mb-4 items-end">
        <Skeleton width={190} height={44} borderRadius={16} />
      </View>

      <View className="mb-4 flex-row items-end">
        <Skeleton circle height={32} />
        <View className="ml-2">
          <Skeleton width={150} height={36} borderRadius={16} />
        </View>
      </View>

      <View className="mt-auto flex-row items-center rounded-2xl bg-card px-4 py-3">
        <View className="flex-1">
          <Skeleton width="80%" height={14} />
        </View>
        <Ionicons name="send" size={18} color={colors.divider} style={{ marginLeft: 8 }} />
      </View>
    </View>
  );
}
