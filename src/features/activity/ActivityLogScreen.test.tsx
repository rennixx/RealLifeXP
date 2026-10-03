import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as activityService from '@/src/features/activity/activity-service';
import type { ActivityLogResult } from '@/src/features/activity/activity-service';
import { ActivityLogScreen } from '@/src/features/activity/ActivityLogScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/src/features/activity/activity-service', () => ({
  fetchActivityLogContext: jest.fn(),
  generateClientRequestId: jest.fn(() => 'client-request-id'),
  logActivity: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockFetchActivityLogContext = activityService.fetchActivityLogContext as jest.MockedFunction<
  typeof activityService.fetchActivityLogContext
>;
const mockLogActivity = activityService.logActivity as jest.MockedFunction<typeof activityService.logActivity>;

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
      <ActivityLogScreen />
    </QueryClientProvider>
  );
}

function mockSuccessResult(): ActivityLogResult {
  return {
    activityId: 'activity-id',
    xpAwarded: 10,
    character: {
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 100,
      newTotalXp: 110,
    },
    category: {
      id: 'cat-fitness',
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 60,
      newTotalXp: 70,
    },
    attribute: {
      id: 'attr-cardio',
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 30,
      newTotalXp: 40,
    },
    unlockedAchievements: [],
    unlockedTitles: [],
  };
}

it('submits selected activity through RPC and shows success state', async () => {
  mockFetchActivityLogContext.mockResolvedValue({
    categories: [
      {
        id: 'cat-fitness',
        name: 'Fitness',
        slug: 'fitness',
        colorToken: '#ffba43',
        sortOrder: 0,
      },
    ],
    attributesByCategory: {
      'cat-fitness': [
        {
          id: 'attr-cardio',
          categoryId: 'cat-fitness',
          name: 'Cardio',
          slug: 'cardio',
        },
      ],
    },
    templates: [
      {
        id: 'template-morning-run',
        categoryId: 'cat-fitness',
        attributeId: 'attr-cardio',
        name: 'Morning Run',
        description: 'Simple cardio',
        xpTier: 'quick',
        xpValue: 10,
        iconKey: 'run',
        categoryName: 'Fitness',
        categorySlug: 'fitness',
        attributeName: 'Cardio',
        attributeSlug: 'cardio',
        isFavorite: false,
        useCount: 0,
        lastUsedAt: null,
      },
    ],
  });

  mockLogActivity.mockResolvedValue(mockSuccessResult());

  const screen = renderScreen();

  expect(await screen.findByText('Log Activity')).toBeTruthy();
  expect(await screen.findByText('Morning Run')).toBeTruthy();

  fireEvent.press(screen.getByText('Morning Run'));
  fireEvent.press(screen.getByText('Confirm and log activity'));

  await waitFor(() => {
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  expect(await screen.findByText('Activity logged!')).toBeTruthy();
  expect(screen.getByText('Template: Morning Run')).toBeTruthy();
  expect(screen.getByTestId('activity-log-success-xp')).toHaveTextContent('+10 XP');
});
