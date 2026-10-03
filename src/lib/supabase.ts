import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { assertEnvironment } from '@/src/lib/env';

// eslint-disable-next-line import/no-unresolved
import 'react-native-url-polyfill/auto';

function createStorage() {
  return {
    getItem: async (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!client) {
    const env = assertEnvironment();
    client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: createStorage(),
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          'X-Client-Environment': env.EXPO_PUBLIC_APP_ENV,
        },
      },
    });
  }

  return client;
}
