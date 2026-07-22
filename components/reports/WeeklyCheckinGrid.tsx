import { View, Text } from 'react-native';
import { colors } from '../../constants/theme';
import { addDaysToDateString, dayAbbreviation } from '../../lib/mauritiusTime';

/** Seven cells, Monday→Sunday of one week (week_start is always a Monday by
 *  construction — see generate-weekly-reports). Green = checked in, red =
 *  missed, pale grey = hasn't happened yet.
 *
 *  asOfDate is the last day that has actually happened; days after it render
 *  as "future" rather than "missed". Omit it for a finished week (the report
 *  history tab), where every non-green day genuinely IS a missed day. */
export function WeeklyCheckinGrid({
  weekStart,
  checkedInDates,
  asOfDate,
}: {
  weekStart: string;
  checkedInDates: Set<string>;
  asOfDate?: string;
}) {
  return (
    <View className="flex-row">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const date = addDaysToDateString(weekStart, i);
        // ISO date strings compare correctly as plain strings.
        const isFuture = asOfDate !== undefined && date > asOfDate;
        const color = checkedInDates.has(date)
          ? colors.riskLow
          : isFuture
            ? colors.divider
            : colors.riskHigh;
        return (
          <View key={date} className="mr-2 items-center">
            <Text className="text-[10px] text-text-muted">{dayAbbreviation(date)}</Text>
            <View className="mt-1 h-5 w-5 rounded-md" style={{ backgroundColor: color }} />
          </View>
        );
      })}
    </View>
  );
}
