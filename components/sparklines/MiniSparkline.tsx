import Svg, { Polyline } from 'react-native-svg';

interface MiniSparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

/**
 * Small inline trend line for the doctor dashboard's patient rows.
 * Plain SVG polyline (not react-native-chart-kit) — chart-kit's fixed
 * chart padding fights a ~50px inline sparkline; chart-kit is reserved
 * for the full 7-day + forecast charts in Phase 3.
 */
export function MiniSparkline({ data, color, width = 56, height = 24 }: MiniSparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
