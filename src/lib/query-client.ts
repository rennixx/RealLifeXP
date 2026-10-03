import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false;
        }

        const message = error instanceof Error ? error.message : '';
        return !message.toLowerCase().includes('validation');
      },
    },
  },
});