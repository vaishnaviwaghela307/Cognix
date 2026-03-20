export const Colors = {
  primary: '#48A9A6',
  primaryDark: '#3f9491',
  primaryLight: '#5BC0BD',
  
  secondary: '#30ABE8',
  secondaryDark: '#2891C4',
  
  background: {
    light: '#F8F9FA',
    dark: '#101D22',
    card: '#FFFFFF',
    cardDark: '#1A2930',
  },
  
  text: {
    primary: '#0D181B',
    secondary: '#4C869A',
    tertiary: '#64748B',
    light: '#FFFFFF',
    dark: '#1E293B',
  },
  
  border: {
    light: '#E7F0F3',
    medium: '#CBD5E1',
    dark: '#475569',
  },
  
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
