import { computeForecast, forecastsHighRisk } from './forecast';

describe('computeForecast', () => {
  it('perfectly linear increasing series projects the exact line', () => {
    // y = 10,20,30,40,50,60,70 over x = 0..6 is exactly y = 10 + 10x.
    // slope 10, intercept 10 => x=7 -> 80, x=8 -> 90, x=9 -> 100 (all in range).
    const result = computeForecast([10, 20, 30, 40, 50, 60, 70]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(10, 10);
    expect(result!.projections[0]).toBeCloseTo(80, 10);
    expect(result!.projections[1]).toBeCloseTo(90, 10);
    expect(result!.projections[2]).toBeCloseTo(100, 10);
  });

  it('flat series has slope 0 and projects the same score', () => {
    // All 50 => slope 0, intercept 50 => every projection is 50.
    const result = computeForecast([50, 50, 50, 50, 50, 50, 50]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBe(0);
    expect(result!.projections).toEqual([50, 50, 50]);
  });

  it('decreasing series has negative slope and clamps at 0', () => {
    // y = 60,50,40,30,20,10,0 is exactly y = 60 - 10x. slope -10, intercept 60.
    // x=7 -> -10, x=8 -> -20, x=9 -> -30, all clamped to 0.
    const result = computeForecast([60, 50, 40, 30, 20, 10, 0]);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(-10, 10);
    expect(result!.projections).toEqual([0, 0, 0]);
  });

  it('series projecting above 100 clamps at 100', () => {
    // y = 40,50,60,70,80,90,100 is exactly y = 40 + 10x. slope 10, intercept 40.
    // x=7 -> 110, x=8 -> 120, x=9 -> 130, all clamped to 100.
    const result = computeForecast([40, 50, 60, 70, 80, 90, 100]);
    expect(result).not.toBeNull();
    expect(result!.projections).toEqual([100, 100, 100]);
  });

  it('fewer than 7 scores returns null', () => {
    expect(computeForecast([10, 20, 30])).toBeNull();
  });

  it('more than 7 scores returns null (caller must pass exactly the last 7)', () => {
    expect(computeForecast([10, 20, 30, 40, 50, 60, 70, 80])).toBeNull();
  });
});

describe('forecastsHighRisk', () => {
  it('true when any projection >= 70', () => {
    expect(forecastsHighRisk({ slope: 10, projections: [50, 60, 70] })).toBe(true);
  });

  it('false when every projection < 70', () => {
    expect(forecastsHighRisk({ slope: 0, projections: [50, 60, 69] })).toBe(false);
  });

  it('false for null input', () => {
    expect(forecastsHighRisk(null)).toBe(false);
  });
});
