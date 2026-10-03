import { buildProgress } from '@/src/features/dashboard/dashboard-service';

jest.mock('@/src/lib/supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

type Threshold = {
  level: number;
  cumulative_xp: number | null;
  required_for_next_level: number | null;
};

function makeThresholds(level: number, cumulativeXp: number, requiredForNext: number) {
  const map = new Map<number, Threshold>();
  map.set(level, { level, cumulative_xp: cumulativeXp, required_for_next_level: requiredForNext });
  return map;
}

it('renders level boundary at threshold start as 0% progress', () => {
  const thresholds = makeThresholds(2, 100, 120);
  const snapshot = buildProgress(2, 100, thresholds);

  expect(snapshot.level).toBe(2);
  expect(snapshot.xpInCurrentLevel).toBe(0);
  expect(snapshot.xpToNext).toBe(120);
  expect(snapshot.progressPercent).toBe(0);
});

it('renders exact threshold target as 100% progress', () => {
  const thresholds = makeThresholds(1, 0, 100);
  const snapshot = buildProgress(1, 100, thresholds);

  expect(snapshot.xpInCurrentLevel).toBe(100);
  expect(snapshot.xpToNext).toBe(0);
  expect(snapshot.progressPercent).toBe(100);
});

it('clamps negative and over-100 progress to safe 0..100 bounds', () => {
  const thresholds = makeThresholds(2, 500, 40);

  const belowBoundary = buildProgress(2, 450, thresholds);
  expect(belowBoundary.xpInCurrentLevel).toBe(0);
  expect(belowBoundary.xpToNext).toBe(40);
  expect(belowBoundary.progressPercent).toBe(0);

  const aboveBoundary = buildProgress(2, 700, thresholds);
  expect(aboveBoundary.xpInCurrentLevel).toBe(200);
  expect(aboveBoundary.xpToNext).toBe(0);
  expect(aboveBoundary.progressPercent).toBe(100);
});
