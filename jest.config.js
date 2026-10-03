module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-.*|@expo/.*|react-native-reanimated|react-native-safe-area-context|react-native-screens|@tanstack|@supabase|react-hook-form|zod|react-native-view-shot|react-native-svg|@react-native-async-storage/async-storage)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
