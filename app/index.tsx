import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { colors, spacing, typography } from '@/src/theme/tokens';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { fetchOnboardingStatus } from '@/src/features/onboarding/onboarding-service';
import { Screen } from '@/src/components/ui/Screen';

import { useQuery } from '@tanstack/react-query';

export default function StartupGate() {
  const { isLoading: isAuthLoading, session } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['auth', 'onboarding', 'status'],
    queryFn: fetchOnboardingStatus,
    enabled: !!session && !isAuthLoading,
    staleTime: 30_000,
  });

  const shouldShowOnboarding = useMemo(() => {
    if (!session) {
      return false;
    }

    if (!profileQuery.data) {
      return true;
    }

    return profileQuery.data.onboardingCompleted === false;
  }, [session, profileQuery.data]);

  if (isAuthLoading || profileQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading account…</Text>
        </View>
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profileQuery.isError) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={styles.errorTitle}>Unable to load profile.</Text>
          <Text style={styles.errorMessage}>Please retry on a better network connection.</Text>
        </View>
      </Screen>
    );
  }

  if (shouldShowOnboarding) {
    return <Redirect href="/(onboarding)/identity" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  errorTitle: {
    color: colors.textPrimary,
    ...typography.body,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.textSecondary,
    ...typography.body,
    textAlign: 'center',
  },
});
