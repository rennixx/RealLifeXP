import { colors as appColors } from '@/src/theme/tokens';

const tintColorLight = appColors.accent;
const tintColorDark = '#F0EDE4';

export default {
  light: {
    text: appColors.textPrimary,
    background: appColors.background,
    tint: tintColorLight,
    tabIconDefault: appColors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: appColors.textPrimary,
    background: appColors.background,
    tint: tintColorDark,
    tabIconDefault: appColors.textMuted,
    tabIconSelected: appColors.accent,
  },
};