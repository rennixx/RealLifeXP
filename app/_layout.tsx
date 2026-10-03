import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { StatusBar } from 'expo-status-bar';
import { assertEnvironment } from '@/src/lib/env';
import { queryClient } from '@/src/lib/query-client';
import { AuthProvider } from '@/src/features/auth/AuthProvider';
import { useColorScheme } from '@/components/useColorScheme';

assertEnvironment();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="log-activity" options={{ headerShown: true, title: 'Log Activity' }} />
          <Stack.Screen name="templates" options={{ headerShown: true, title: 'Templates' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </QueryClientProvider>
  );
}
