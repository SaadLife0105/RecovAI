import { View, Text } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { ForecastResult } from '../../lib/forecast';

interface RiskTrendChartProps {
  history: number[]; // chronological, 2–7 values
  forecast: ForecastResult | null;
  width?: number;
  height?: number;
}

/**
 * 7-day risk history + 3-day forecast, plotted on a fixed 0–100 y-axis.
 * Plain react-native-svg (not react-native-chart-kit) — chart-kit has no
 * native dashed-line support, and this chart needs strokeDasharray for both
 * the forecast segment and the danger-threshold line, so raw SVG gives full
 * control instead of fighting the library (same reasoning as MiniSparkline).
 */
export function RiskTrendChart({ history, forecast, width = 300, height = 160 }: RiskTrendChartProps) {
  if (history.length < 2) {
    return (
      <Text className="text-xs text-text-muted">Not enough data yet — check back after a few more check-ins.</Text>
    );
  }

  const padLeft = 24; // room for the y-axis labels
  const padRight = 8;
  const padTop = 8;
  const padBottom = 8;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Fixed 0–100 y-scale so the danger line at 70 is always meaningful.
  const yFor = (score: number) => padTop + (1 - Math.min(100, Math.max(0, score)) / 100) * plotH;

  const projections = forecast?.projections ?? [];
  // x-axis spans every plotted point: the historical points then the 3 forecast days.
  const totalPoints = history.length + projections.length;
  const xFor = (index: number) => padLeft + (totalPoints === 1 ? 0 : (index / (totalPoints - 1)) * plotW);

  const historyPoints = history.map((score, i) => ({ x: xFor(i), y: yFor(score) }));
  const forecastPoints = projections.map((score, i) => ({ x: xFor(history.length + i), y: yFor(score) }));
  // Forecast line starts at the last real point so the dashed segment connects.
  const forecastLine = forecastPoints.length ? [historyPoints[historyPoints.length - 1], ...forecastPoints] : [];

  const toPolyline = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <Line
            key={`grid-${tick}`}
            x1={padLeft}
            y1={yFor(tick)}
            x2={width - padRight}
            y2={yFor(tick)}
            stroke={colors.divider}
            strokeWidth={1}
          />
        ))}
        {[0, 25, 50, 75, 100].map((tick) => (
          <SvgText key={`label-${tick}`} x={0} y={yFor(tick) + 3} fontSize={8} fill={colors.textMuted}>
            {tick}
          </SvgText>
        ))}

        {/* Danger threshold at 70 */}
        <Line
          x1={padLeft}
          y1={yFor(70)}
          x2={width - padRight}
          y2={yFor(70)}
          stroke={colors.riskHigh}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <SvgText x={padLeft + 2} y={yFor(70) - 3} fontSize={8} fill={colors.riskHigh}>
          Danger threshold
        </SvgText>

        {/* Historical actuals — solid line + filled dots */}
        <Polyline
          points={toPolyline(historyPoints)}
          fill="none"
          stroke={colors.secondary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {historyPoints.map((p, i) => (
          <Circle key={`h-${i}`} cx={p.x} cy={p.y} r={3} fill={colors.secondary} />
        ))}

        {/* Forecast — dashed line + hollow dots */}
        {forecastLine.length ? (
          <>
            <Polyline
              points={toPolyline(forecastLine)}
              fill="none"
              stroke={colors.riskMedium}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="5 4"
            />
            {forecastPoints.map((p, i) => (
              <Circle key={`f-${i}`} cx={p.x} cy={p.y} r={3} fill="none" stroke={colors.riskMedium} strokeWidth={2} />
            ))}
          </>
        ) : null}
      </Svg>
    </View>
  );
}
