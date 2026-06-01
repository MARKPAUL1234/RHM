import { Platform } from 'react-native';

// Custom Design System Tokens for the Remote Health Monitoring Tool (RHMT)

export const DARK_COLORS = {
  // Base Clinical / Hospital Dark-mode backgrounds
  background: '#121212',    // Premium Charcoal Black background
  surface: '#1E1E1E',       // Dark Charcoal grey cards/surfaces
  surfaceLight: '#2D2D2D',  // Soft dark grey for input boxes, pills, and headers
  
  // Glassmorphic translucent overlays (dark mode)
  glassBackground: 'rgba(30, 30, 30, 0.85)',
  glassBorder: 'rgba(225, 173, 1, 0.12)',
  
  // Accent & Health Status colors (vibrant, clinical gold)
  primary: '#E1AD01',       // Mustard Yellow / Dull Gold for core navigation & primary operations
  primaryLight: '#F3C623',  // Lighter Gold for active links & selected highlights
  secondary: '#FFFFFF',     // Crisp White for data trends and parameters
  accent: '#E1AD01',        // Gold accent for fitness metrics
  
  // Connection / Alert levels (strictly gold and grey/white scale)
  online: '#E1AD01',        // Gold for online status
  offline: '#666666',       // Muted grey for offline status
  critical: '#E1AD01',      // Gold for vital alarms (no green, no red to respect strict palette)
  
  // Typography Neutral Scale (High-contrast for accessibility)
  textPrimary: '#FFFFFF',   // Crisp White for core body & head text
  textSecondary: '#CCCCCC', // Light grey for labels & summaries
  textMuted: '#888888',     // Medium grey for timestamps and descriptions
  
  // Interactive / State colors
  border: '#2E2E2E',        // Dark grey borders for cards & dividers
  shadow: 'rgba(0, 0, 0, 0.5)', // Dark shadow depth
};

export const LIGHT_COLORS = {
  // Base Clinical / Hospital Light-mode backgrounds
  background: '#F8F9FA',    // Premium Soft Light Grey background
  surface: '#FFFFFF',       // Clean Crisp White cards/surfaces
  surfaceLight: '#E9ECEF',  // Soft light grey for input boxes, pills, and headers
  
  // Glassmorphic translucent overlays (light mode)
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(225, 173, 1, 0.08)',
  
  // Accent & Health Status colors (vibrant, clinical gold)
  primary: '#C99E02',       // Warm Golden Mustard for high readability on light backgrounds
  primaryLight: '#E1AD01',  // Muted Gold for highlights
  secondary: '#121212',     // Crisp Charcoal Black for secondary details
  accent: '#C99E02',        // Gold accent
  
  // Connection / Alert levels
  online: '#C99E02',
  offline: '#888888',
  critical: '#C99E02',
  
  // Typography Neutral Scale
  textPrimary: '#1E1E1E',   // Deep Charcoal Black for core text
  textSecondary: '#495057', // Medium Charcoal for labels & summaries
  textMuted: '#6C757D',     // Medium-light grey for timestamps and descriptions
  
  // Interactive / State colors
  border: '#DEE2E6',        // Light grey borders
  shadow: 'rgba(0, 0, 0, 0.08)', // Soft light shadow depth
};

// Default export compatibility
export const COLORS = DARK_COLORS;

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
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  borderRadius: 16,
  borderRadiusSm: 8,
};

export const SHADOWS = {
  premium: Platform.select({
    web: {
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.2)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
  neonGreen: Platform.select({
    web: {
      boxShadow: '0 0 14px rgba(225, 173, 1, 0.3)',
    },
    default: {
      shadowColor: '#E1AD01',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
  neonRed: Platform.select({
    web: {
      boxShadow: '0 0 16px rgba(225, 173, 1, 0.4)',
    },
    default: {
      shadowColor: '#E1AD01',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
};

export default {
  COLORS,
  DARK_COLORS,
  LIGHT_COLORS,
  TYPOGRAPHY,
  SPACING,
  SHADOWS,
};


