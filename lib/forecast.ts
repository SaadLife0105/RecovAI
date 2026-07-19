export interface ForecastResult {
  slope: number;
  projections: [number, number, number]; // day+1, day+2, day+3
}

/**
 * Least-squares linear regression over a patient's last 7 daily risk scores,
 * projecting the next 3 days. Requires EXACTLY 7 chronological scores (oldest
 * to newest); fewer or more returns null — the caller (usePatients) is
 * responsible for slicing to the last 7 (Development Plan Critical Caution
 * #19: new patients break the regression, don't extrapolate from fewer points).
 */
export function computeForecast(last7Scores: number[]): ForecastResult | null {
  if (last7Scores.length !== 7) return null;

  const n = 7;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let x = 0; x < n; x++) {
    const y = last7Scores[x];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  // denom is 0 only for degenerate x-values; with fixed indices 0..6 it's
  // constant (196), but guard anyway → flat line at the mean.
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const project = (x: number) => Math.min(100, Math.max(0, intercept + slope * x));

  return {
    slope,
    projections: [project(7), project(8), project(9)],
  };
}

/** True if any of the 3 projected days crosses into the High risk band (>=70). */
export function forecastsHighRisk(forecast: ForecastResult | null): boolean {
  if (!forecast) return false;
  return forecast.projections.some((p) => p >= 70);
}
