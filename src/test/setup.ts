import '@testing-library/jest-native/extend-expect';

((globalThis as unknown as { jest?: { mock: (path: string) => void } }).jest)?.mock(
  'react-native/Libraries/Animated/NativeAnimatedHelper'
);
