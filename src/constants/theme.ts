export const colors = {
  // iOS system blue
  primary: '#007AFF',
  primaryLight: 'rgba(0,122,255,0.12)',

  // Semantic
  danger: '#FF3B30',
  warning: '#FF9F0A',
  success: '#30D158',

  // Backgrounds — dark mode friendly
  bg: '#000000',
  bgSecondary: '#1C1C1E',
  card: 'rgba(28,28,30,0.72)',
  cardLight: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.22)',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',

  // Severity
  high: '#FF453A',
  medium: '#FF9F0A',
  none: '#30D158',
};

export const radius = {
  sm: 8,
  md: 13,
  lg: 18,
  xl: 26,
  full: 9999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};
