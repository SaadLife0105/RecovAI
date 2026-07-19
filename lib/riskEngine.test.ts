import { computeBreakdown, computeRiskScore, RiskInputs } from './riskEngine';

describe('computeRiskScore', () => {
  it('best-case inputs score 0', () => {
    // craving 0*0.3*10=0, mood (10-10)*0.2*10=0, sleep (10-10)*0.15*10=0,
    // isolation 0, lowActivity (5000 >= 2000) 0, zone 0 => base 0, score 0
    const inputs: RiskInputs = {
      craving: 0,
      mood: 10,
      sleep: 10,
      isolated: false,
      steps: 5000,
      zoneDangerLevel: 'safe',
    };
    expect(computeRiskScore(inputs, 'cannabis')).toBe(0);
  });

  it('worst-case inputs with cannabis: base is exactly 100', () => {
    // craving 10*0.3*10=30, mood (10-0)*0.2*10=20, sleep (10-0)*0.15*10=15,
    // isolation 15, lowActivity (500 < 2000) 10, zone 10
    // base = 30+20+15+15+10+10 = 100; cannabis sensitivity 1.00 => score 100
    const inputs: RiskInputs = {
      craving: 10,
      mood: 0,
      sleep: 0,
      isolated: true,
      steps: 500,
      zoneDangerLevel: 'high_risk',
    };
    const breakdown = computeBreakdown(inputs, 'cannabis');
    expect(breakdown.base).toBe(100);
    expect(breakdown.score).toBe(100);
  });

  it('worst-case inputs with heroin_opioids clamp at 100', () => {
    // base 100 * 1.15 = 115, clamped to 100
    const inputs: RiskInputs = {
      craving: 10,
      mood: 0,
      sleep: 0,
      isolated: true,
      steps: 500,
      zoneDangerLevel: 'high_risk',
    };
    const breakdown = computeBreakdown(inputs, 'heroin_opioids');
    expect(breakdown.base * breakdown.sensitivityMultiplier).toBeCloseTo(115, 10);
    expect(breakdown.score).toBe(100);
  });

  it('isolation-only contributes exactly 15', () => {
    // craving 0, mood (10-10)*0.2*10=0, sleep (10-10)*0.15*10=0,
    // isolation 15, lowActivity (5000 >= 2000) 0, zone 0 => base 15
    // cannabis sensitivity 1.00 => score 15
    const inputs: RiskInputs = {
      craving: 0,
      mood: 10,
      sleep: 10,
      isolated: true,
      steps: 5000,
      zoneDangerLevel: 'safe',
    };
    expect(computeRiskScore(inputs, 'cannabis')).toBe(15);
  });

  it('class-modifier ratio holds for a moderate, non-clipping case', () => {
    // craving 5*0.3*10=15, mood (10-5)*0.2*10=10, sleep (10-5)*0.15*10=7.5,
    // isolation 0, lowActivity (5000 >= 2000) 0, zone 0 => base 32.5
    // cannabis score = 32.5, heroin_opioids score = 32.5 * 1.15 = 37.375 (neither clips 100)
    const inputs: RiskInputs = {
      craving: 5,
      mood: 5,
      sleep: 5,
      isolated: false,
      steps: 5000,
      zoneDangerLevel: 'safe',
    };
    const cannabisScore = computeRiskScore(inputs, 'cannabis');
    const heroinScore = computeRiskScore(inputs, 'heroin_opioids');
    expect(heroinScore).toBeCloseTo(cannabisScore * 1.15, 10);
  });

  it('low_risk zone contributes exactly 3', () => {
    const inputs: RiskInputs = {
      craving: 0,
      mood: 10,
      sleep: 10,
      isolated: false,
      steps: 5000,
      zoneDangerLevel: 'low_risk',
    };
    expect(computeBreakdown(inputs, 'cannabis').zoneProximityContribution).toBe(3);
  });

  it('medium_risk zone contributes exactly 6', () => {
    const inputs: RiskInputs = {
      craving: 0,
      mood: 10,
      sleep: 10,
      isolated: false,
      steps: 5000,
      zoneDangerLevel: 'medium_risk',
    };
    expect(computeBreakdown(inputs, 'cannabis').zoneProximityContribution).toBe(6);
  });

  it('null zone contributes exactly 0 (same as safe)', () => {
    const inputs: RiskInputs = {
      craving: 0,
      mood: 10,
      sleep: 10,
      isolated: false,
      steps: 5000,
      zoneDangerLevel: null,
    };
    expect(computeBreakdown(inputs, 'cannabis').zoneProximityContribution).toBe(0);
  });
});
