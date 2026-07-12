import { View } from 'react-native';
import { Skeleton } from './Skeleton';

const CARDS = 3;

/** Loading placeholder for reports.tsx's report cards. */
export function ReportListSkeleton() {
  return (
    <View>
      {Array.from({ length: CARDS }).map((_, i) => (
        <View key={i} className="mb-3 flex-row items-center rounded-2xl bg-card p-4">
          <Skeleton width={40} height={40} borderRadius={10} />
          <View className="ml-3 flex-1">
            <Skeleton width="55%" height={12} />
            <View className="mt-2">
              <Skeleton width="35%" height={10} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
