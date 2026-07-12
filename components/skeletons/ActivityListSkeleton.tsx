import { View } from 'react-native';
import { Skeleton } from './Skeleton';

const CARDS = 3;

/** Loading placeholder for history.tsx's activity feed. */
export function ActivityListSkeleton() {
  return (
    <View>
      {Array.from({ length: CARDS }).map((_, i) => (
        <View key={i} className="mb-3 flex-row items-center rounded-2xl bg-card p-3">
          <Skeleton circle height={40} />
          <View className="ml-3 flex-1">
            <Skeleton width="60%" height={12} />
            <View className="mt-2">
              <Skeleton width="85%" height={10} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
