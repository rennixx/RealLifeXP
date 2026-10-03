import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/src/features/onboarding/OnboardingDraftContext';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="identity" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="activities" />
        <Stack.Screen name="preview" />
      </Stack>
    </OnboardingDraftProvider>
  );
}
