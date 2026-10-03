import { Platform } from 'react-native';

export const spacing = {
  unit: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  xxxl: 36,
} as const;

const terminalHeaderFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const terminalBodyFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export const radii = {
  sm: 0,
  md: 0,
  lg: 0,
  pill: 999,
} as const;

export const elevations = {
  subtle: {
    shadowColor: 'rgba(255, 176, 0, 0.45)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  subtleGlow: {
    shadowColor: 'rgba(255, 225, 147, 0.55)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
} as const;

export const colors = {
  background: '#090909',
  surface: '#141414',
  surfaceContainer: '#161616',
  surfaceContainerHigh: '#1f1f1f',
  surfaceContainerHighest: '#272727',
  surfaceVariant: '#2d2d2d',
  textPrimary: '#f4efe7',
  textSecondary: '#ccbda7',
  textMuted: '#9f8b71',
  border: '#2b2b2b',
  outline: '#5f574a',
  outlineVariant: '#3e3a32',
  accent: '#ffc74f',
  accentGlow: '#ffd57a',
  accentDark: '#ffad17',
  accentForeground: '#261a02',
  success: '#44cfac',
  warning: '#ffc94d',
  danger: '#ff7288',
  inverseSurface: '#f4efe7',
  inverseOnSurface: '#3a3a3a',
} as const;

export const typography = {
  display: {
    large: {
      fontFamily: terminalHeaderFont,
      fontSize: 72,
      fontWeight: '400' as const,
      lineHeight: 72,
      letterSpacing: 1.44,
    },
    medium: {
      fontFamily: terminalHeaderFont,
      fontSize: 48,
      fontWeight: '400' as const,
      lineHeight: 48,
      letterSpacing: 0.96,
    },
    small: {
      fontFamily: terminalHeaderFont,
      fontSize: 40,
      fontWeight: '400' as const,
      lineHeight: 40,
      letterSpacing: 0.8,
    },
    title: {
      fontFamily: terminalHeaderFont,
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 28,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
  },
  title: {
    fontFamily: terminalHeaderFont,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: spacing.sm,
  },
  body: {
    fontFamily: terminalBodyFont,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.16,
  },
  bodyLarge: {
    fontFamily: terminalBodyFont,
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 26,
    letterSpacing: 0.18,
    marginHorizontal: spacing.xs,
  },
  caption: {
    fontFamily: terminalHeaderFont,
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1.8,
  },
  label: {
    fontFamily: terminalHeaderFont,
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1.8,
  },
} as const;

export const uiMotion = {
  fast: 160,
  normal: 240,
  reduced: 0,
} as const;
