import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { riskBandColors } from '../../constants/theme';

/** Compact single-color ring badge for list rows — distinct from RiskGauge's 3-band arc. */
export function RiskRingBadge({ score, size = 44, strokeWidth = 4 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const color = riskBandColors(score).dot;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text className="text-xs font-bold text-text-dark">{score}</Text>
      </View>
    </View>
  );
}
