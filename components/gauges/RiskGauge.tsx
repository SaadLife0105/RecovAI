import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, riskBand } from '../../constants/theme';

const SWEEP_DEGREES = 200; // arc opening at the bottom, per mockup proportions
const START_ANGLE = -90 - SWEEP_DEGREES / 2;

/**
 * Circular risk gauge: a static 3-band colored arc (green/amber/red)
 * with the score + band label centered inside, PLUS a marker tick
 * showing where the current score actually sits on the arc — the bands
 * alone don't communicate a value, only the marker + center text do.
 */
export function RiskGauge({ score, size = 150, showCaption = true }: { score: number; size?: number; showCaption?: boolean }) {
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

  // Marker position: same rotation convention as the bands above, just a
  // short tick instead of a third of the circle, placed at the score's
  // proportional position along the full 200° sweep.
  const clampedScore = Math.min(100, Math.max(0, score));
  const markerRotate = START_ANGLE + (clampedScore / 100) * SWEEP_DEGREES;
  const markerLength = circumference * (6 / 360); // small fixed-degree tick, independent of size
  const markerGap = circumference - markerLength;

  return (
    <View style={{ alignItems: 'center' }}>
      {/* One accessible element for the whole gauge: without this a screen
          reader traverses the decorative arcs and the score/label Texts as
          three disconnected stops. The synthesized label below is the only
          thing it should ever announce here. */}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Risk score ${score} out of 100, ${label}`}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg
          width={size}
          height={size}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
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
          {/* Position marker — the actual "where am I on this scale" indicator */}
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={colors.textDark}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeDasharray={`${markerLength} ${markerGap}`}
            fill="none"
            origin={`${cx}, ${cy}`}
            rotation={markerRotate}
          />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text className="text-3xl font-bold text-text-dark">{score}</Text>
          <Text style={{ color: labelColor }} className="text-xs font-semibold">
            {label}
          </Text>
        </View>
      </View>
      {showCaption && <Text className="mt-1 text-xs text-text-muted">Higher score means higher relapse risk</Text>}
    </View>
  );
}
