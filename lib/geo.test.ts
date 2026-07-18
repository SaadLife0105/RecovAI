import { haversineDistanceMeters } from './geo';

test('haversine: same point is 0m', () => {
  expect(haversineDistanceMeters(-20.16, 57.5, -20.16, 57.5)).toBe(0);
});

test('haversine: 1° latitude ≈ 111.2km', () => {
  const d = haversineDistanceMeters(0, 0, 1, 0);
  expect(d).toBeGreaterThan(111000);
  expect(d).toBeLessThan(111400);
});
