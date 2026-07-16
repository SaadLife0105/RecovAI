import { getMauritiusDateString, daysBetween } from './mauritiusTime';

describe('getMauritiusDateString', () => {
  it('19:30 UTC is 23:30 Mauritius the same day', () => {
    expect(getMauritiusDateString(new Date('2025-05-24T19:30:00Z'))).toBe('2025-05-24');
  });

  it('20:30 UTC is 00:30 Mauritius the next day', () => {
    expect(getMauritiusDateString(new Date('2025-05-24T20:30:00Z'))).toBe('2025-05-25');
  });

  it('00:00 UTC is 04:00 Mauritius the same day', () => {
    expect(getMauritiusDateString(new Date('2025-05-24T00:00:00Z'))).toBe('2025-05-24');
  });
});

describe('daysBetween', () => {
  it('same day is 0', () => {
    expect(daysBetween('2025-05-24', '2025-05-24')).toBe(0);
  });

  it('consecutive day is 1', () => {
    expect(daysBetween('2025-05-24', '2025-05-25')).toBe(1);
  });

  it('multi-day gap', () => {
    expect(daysBetween('2025-05-24', '2025-05-31')).toBe(7);
  });
});
