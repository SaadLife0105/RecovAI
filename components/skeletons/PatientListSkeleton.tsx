import { View } from 'react-native';
import { Skeleton } from './Skeleton';

const ROWS = 6;

/** Loading placeholder for dashboard.tsx's patient list — mirrors PatientListRow's shape. */
export function PatientListSkeleton() {
  return (
    <View>
      {Array.from({ length: ROWS }).map((_, i) => (
        <View key={i} className="mb-3 flex-row items-center rounded-2xl bg-card p-3">
          <Skeleton circle height={40} />
          <View className="ml-3 flex-1">
            <Skeleton width="70%" height={12} />
            <View className="mt-2">
              <Skeleton width="45%" height={10} />
            </View>
          </View>
          <Skeleton width={28} height={20} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}
