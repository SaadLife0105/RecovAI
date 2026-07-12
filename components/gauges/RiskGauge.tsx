import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, riskBand } from '../../constants/theme';

const SWEEP_DEGREES = 200; // arc opening at the bottom, per mockup proportions
const START_ANGLE = -90 - SWEEP_DEGREES / 2;

/**
 * Circular risk gauge: a static 3-band colored arc (green/amber/red)
 * with the score + band label centered inside. Bands are always fully
 * visible — the score/label text is what actually reflects the value.
 */
export function RiskGauge({ score, size = 150 }: { score: number; size?: number }) {
  const strokeWidth = 9;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const bandSweep = SWEEP_DEGREES / 3;
  const bandLength = circumference * (bandSweep / 360);
  const bandGap = circumference - bandLength;
  const bands = [
    { color: colors.riskLow, rotate: START_ANGLE },
    { color: colors.riskMedium, rotate: START_ANGLE + bandSweep },
    { color: colors.riskHigh, rotate: START_ANGLE + bandSweep * 2 },
  ];

  const band = riskBand(score);
  const label = band === 'high' ? 'High Risk' : band === 'medium' ? 'Medium Risk' : 'Low Risk';
  const labelColor = band === 'high' ? colors.riskHighText : band === 'medium' ? colors.riskMediumText : colors.riskLowText;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {bands.map((b) => (
          <Circle
            key={b.color}
            cx={cx}
            cy={cy}
            r={r}
            stroke={b.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${bandLength} ${bandGap}`}
            fill="none"
            origin={`${cx}, ${cy}`}
            rotation={b.rotate}
          />
        ))}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text className="text-3xl font-bold text-text-dark">{score}</Text>
        <Text style={{ color: labelColor }} className="text-xs font-semibold">
          {label}
        </Text>
      </View>
    </View>
  );
}
