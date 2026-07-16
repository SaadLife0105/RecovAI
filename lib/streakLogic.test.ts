import { computeNextStreak, StreakState } from './streakLogic';

describe('computeNextStreak', () => {
  it('same-day resubmission makes no change', () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 10, lastCheckinDate: '2025-05-24' };
    const next = computeNextStreak(state, '2025-05-24');
    expect(next.isNewDay).toBe(false);
    expect(next.currentStreak).toBe(4);
    expect(next.longestStreak).toBe(10);
    expect(next.lastCheckinDate).toBe('2025-05-24');
  });

  it('consecutive day increments the streak by 1', () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 10, lastCheckinDate: '2025-05-24' };
    const next = computeNextStreak(state, '2025-05-25');
    expect(next.isNewDay).toBe(true);
    expect(next.currentStreak).toBe(5);
    expect(next.longestStreak).toBe(10);
    expect(next.lastCheckinDate).toBe('2025-05-25');
  });

  it('a gap of 2+ days resets the current streak to 1', () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 10, lastCheckinDate: '2025-05-24' };
    const next = computeNextStreak(state, '2025-05-27');
    expect(next.isNewDay).toBe(true);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(10);
    expect(next.lastCheckinDate).toBe('2025-05-27');
  });

  it('longest streak stays at its prior max when current streak resets below it', () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 10, lastCheckinDate: '2025-05-24' };
    const next = computeNextStreak(state, '2025-06-01');
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(10);
  });

  it('a brand-new patient starts their first-ever check-in at streak 1', () => {
    const state: StreakState = { currentStreak: 0, longestStreak: 0, lastCheckinDate: null };
    const next = computeNextStreak(state, '2025-05-24');
    expect(next.isNewDay).toBe(true);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastCheckinDate).toBe('2025-05-24');
  });
});
