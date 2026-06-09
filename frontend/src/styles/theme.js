import { Platform } from 'react-native';

export const DARK_COLORS = {
  background: '#0F172A',
  surface: '#111827',
  surfaceLight: '#1F2937',
  elevated: '#172033',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  secondary: '#14B8A6',
  accent: '#F59E0B',
  online: '#22C55E',
  offline: '#94A3B8',
  critical: '#EF4444',
  warning: '#F59E0B',
  warningLight: '#1F1706',
  success: '#22C55E',
  info: '#38BDF8',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#263247',
  shadow: 'rgba(2, 6, 23, 0.35)',
  glassBackground: 'rgba(17, 24, 39, 0.88)',
  glassBorder: 'rgba(148, 163, 184, 0.18)',
};

export const LIGHT_COLORS = {
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceLight: '#EEF3F8',
  elevated: '#F9FBFD',
  primary: '#2563EB',
  primaryLight: '#1D4ED8',
  secondary: '#0D9488',
  accent: '#D97706',
  online: '#16A34A',
  offline: '#64748B',
  critical: '#DC2626',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  success: '#16A34A',
  info: '#0284C7',
  textPrimary: '#111827',
  textSecondary: '#334155',
  textMuted: '#64748B',
  border: '#D8E0EA',
  shadow: 'rgba(15, 23, 42, 0.08)',
  glassBackground: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(37, 99, 235, 0.12)',
};

export const COLORS = LIGHT_COLORS;

export const TYPOGRAPHY = {
  fontFamily: 'System',
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 15,
    caption: 12,
  },
  weights: {
    bold: '700',
    semiBold: '600',
    medium: '500',
    regular: '400',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  borderRadius: 8,
  borderRadiusSm: 6,
};

export const SHADOWS = {
  premium: Platform.select({
    web: {
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.10)',
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  subtle: Platform.select({
    web: {
      boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
  large: Platform.select({
    web: {
      boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)',
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 30,
      elevation: 8,
    },
  }),
};

export const getResponsiveMetrics = (width = 390) => {
  const isTiny = width < 360;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;

  return {
    isTiny,
    isPhone,
    isTablet,
    isDesktop,
    pagePadding: isTiny ? 12 : isPhone ? 14 : 24,
    contentMaxWidth: isDesktop ? 1180 : '100%',
    cardPadding: isTiny ? 12 : isPhone ? 14 : 18,
    columns: isPhone ? 1 : isTablet ? 2 : 3,
  };
};

export default {
  COLORS,
  DARK_COLORS,
  LIGHT_COLORS,
  TYPOGRAPHY,
  SPACING,
  SHADOWS,
  getResponsiveMetrics,
};
