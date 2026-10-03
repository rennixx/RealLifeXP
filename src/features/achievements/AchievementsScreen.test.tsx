import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AchievementsScreen from '@/app/(tabs)/achievements';
import * as achievementsService from '@/src/features/achievements/achievements-service';
import { trackEvent } from '@/src/lib/analytics';

jest.mock('@/src/features/achievements/achievements-service', () => ({
  fetchAchievementsOverview: jest.fn(),
  equipTitle: jest.fn(),
}));

jest.mock('@/src/lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockFetchAchievementsOverview = achievementsService.fetchAchievementsOverview as jest.MockedFunction<
  typeof achievementsService.fetchAchievementsOverview
>;
const mockEquipTitle = achievementsService.equipTitle as jest.MockedFunction<
  typeof achievementsService.equipTitle
>;

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderScreen() {
  return render(
    <QueryClientProvider client={createClient()}>
      <AchievementsScreen />
    </QueryClientProvider>
  );
}

it('renders unlocked/locked/hidden achievement states and filters', async () => {
  mockFetchAchievementsOverview.mockResolvedValue({
    achievements: [
      {
        id: 'achievement-first',
        slug: 'first-activity',
        name: 'First Pulse',
        hiddenName: 'First Pulse',
        description: 'Unlock your first log.',
        hiddenDescription: 'Unlock your first log.',
        rarity: 'common',
        iconKey: 'sparkles',
        isHidden: false,
        isUnlocked: true,
        unlockedAt: '2024-01-01T00:00:00.000Z',
        rewardTitleId: null,
        rewardTitleName: null,
        sortOrder: 10,
      },
      {
        id: 'achievement-hidden',
        slug: 'secret-operator',
        name: 'Secret Operator',
        hiddenName: 'Classified',
        description: 'Hidden mission unlocked.',
        hiddenDescription: 'Reveal by completing the hidden milestone.',
        rarity: 'epic',
        iconKey: 'psychology',
        isHidden: true,
        isUnlocked: false,
        unlockedAt: null,
        rewardTitleId: null,
        rewardTitleName: null,
        sortOrder: 20,
      },
    ],
    titles: [
      {
        id: 'title-initiate',
        slug: 'the-initiate',
        name: 'The Initiate',
        description: 'Available after onboarding.',
        rarity: 'common',
        iconKey: 'sparkles',
        isOwned: true,
        isEquipped: true,
        unlockedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'title-builder',
        slug: 'the-builder',
        name: 'The Builder',
        description: 'Earned through focused progress.',
        rarity: 'rare',
        iconKey: 'hammer',
        isOwned: true,
        isEquipped: false,
        unlockedAt: '2024-01-04T00:00:00.000Z',
      },
      {
        id: 'title-scholar',
        slug: 'the-scholar',
        name: 'The Scholar',
        description: 'Needs deeper consistency.',
        rarity: 'epic',
        iconKey: 'school',
        isOwned: false,
        isEquipped: false,
        unlockedAt: null,
      },
    ],
    unlockedAchievementCount: 1,
    totalAchievementCount: 2,
    equippedTitleId: 'title-initiate',
  });

  const screen = renderScreen();

  expect(await screen.findByText('Trophies')).toBeTruthy();
  expect(await screen.findByText('1 / 2 Unlocked')).toBeTruthy();
  expect(screen.getByText('First Pulse')).toBeTruthy();

  fireEvent.press(screen.getByText('HIDDEN'));
  expect(await screen.findByText('Classified')).toBeTruthy();
  expect(screen.queryByText('First Pulse')).toBeNull();
});

it('equips owned title and emits analytics', async () => {
  mockFetchAchievementsOverview.mockResolvedValue({
    achievements: [],
    titles: [
      {
        id: 'title-initiate',
        slug: 'the-initiate',
        name: 'The Initiate',
        description: 'Available after onboarding.',
        rarity: 'common',
        iconKey: 'sparkles',
        isOwned: true,
        isEquipped: true,
        unlockedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'title-builder',
        slug: 'the-builder',
        name: 'The Builder',
        description: 'Earned through focused progress.',
        rarity: 'rare',
        iconKey: 'hammer',
        isOwned: true,
        isEquipped: false,
        unlockedAt: '2024-01-04T00:00:00.000Z',
      },
    ],
    unlockedAchievementCount: 0,
    totalAchievementCount: 0,
    equippedTitleId: 'title-initiate',
  });
  mockEquipTitle.mockResolvedValue();

  const screen = renderScreen();

  const equipButton = await screen.findByText('Equip');
  fireEvent.press(equipButton);

  await waitFor(() => {
    expect(mockEquipTitle).toHaveBeenCalledWith('title-builder');
  });

  await waitFor(() => {
    expect(trackEvent).toHaveBeenCalledWith('title_equipped', { title_id: 'title-builder' });
  });
});
