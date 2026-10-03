import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HistoryScreen from '@/app/(tabs)/history';
import * as historyService from '@/src/features/history/history-service';
import { trackEvent } from '@/src/lib/analytics';

jest.mock('@/src/features/history/history-service', () => ({
  fetchHistoryFilterOptions: jest.fn(),
  fetchActivityHistoryPage: jest.fn(),
  reverseActivity: jest.fn(),
}));

jest.mock('@/src/lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockFetchHistoryFilterOptions = historyService.fetchHistoryFilterOptions as jest.MockedFunction<
  typeof historyService.fetchHistoryFilterOptions
>;
const mockFetchActivityHistoryPage = historyService.fetchActivityHistoryPage as jest.MockedFunction<
  typeof historyService.fetchActivityHistoryPage
>;
const mockReverseActivity = historyService.reverseActivity as jest.MockedFunction<
  typeof historyService.reverseActivity
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
      <HistoryScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('loads activity history and submits a reversal from the confirmation flow', async () => {
  mockFetchHistoryFilterOptions.mockResolvedValue({
    categories: [
      {
        id: 'cat-fitness',
        name: 'Fitness',
        slug: 'fitness',
        colorToken: 'amber',
      },
    ],
    attributes: [
      {
        id: 'attr-cardio',
        name: 'Cardio',
        slug: 'cardio',
        categoryId: 'cat-fitness',
        categoryName: 'Fitness',
      },
    ],
    templates: [
      {
        id: 'template-run',
        name: 'Morning Run',
      },
    ],
  });

  mockFetchActivityHistoryPage.mockResolvedValue({
    activities: [
      {
        id: 'activity-1',
        templateId: 'template-run',
        templateName: 'Morning Run',
        xpAwarded: 10,
        xpTier: 'quick',
        status: 'active',
        occurredAt: '2024-01-01T12:00:00.000Z',
        categoryId: 'cat-fitness',
        categoryName: 'Fitness',
        categorySlug: 'fitness',
        categoryColorToken: 'amber',
        attributeId: 'attr-cardio',
        attributeName: 'Cardio',
        attributeSlug: 'cardio',
        note: null,
        privateReflection: null,
        durationMinutes: 30,
        clientRequestId: 'client-1',
      },
    ],
    hasMore: false,
    nextPage: 1,
  });

  mockReverseActivity.mockResolvedValue({
    activityId: 'activity-1',
    xpAwarded: -10,
    character: {
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 10,
      newTotalXp: 0,
    },
    category: {
      id: 'cat-fitness',
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 10,
      newTotalXp: 0,
    },
    attribute: {
      id: 'attr-cardio',
      oldLevel: 1,
      newLevel: 1,
      oldTotalXp: 10,
      newTotalXp: 0,
    },
  });

  const screen = renderScreen();

  expect(await screen.findByText('History')).toBeTruthy();
  expect(await screen.findByText('Morning Run')).toBeTruthy();
  fireEvent.press(await screen.findByText('Reverse'));

  expect(await screen.findByText('Reverse this activity?')).toBeTruthy();
  fireEvent.press(await screen.findByText('Confirm'));

  await waitFor(() => {
    expect(mockReverseActivity).toHaveBeenCalledWith('activity-1');
  });

  expect(await screen.findByText('Activity reversed')).toBeTruthy();
  expect(await screen.findByText('Entry activity-1 was reversed for 10 XP.')).toBeTruthy();
  expect(
    await screen.findByText('XP is unchanged after reversal because this activity was already reversed.'),
  ).toBeTruthy();

  await waitFor(() => {
    expect(trackEvent).toHaveBeenCalledWith('activity_reversed', { activity_id: 'activity-1' });
  });
});
