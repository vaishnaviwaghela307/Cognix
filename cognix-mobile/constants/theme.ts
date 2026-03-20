// Professional Design System for Cognix

export const COLORS = {
  // Primary Colors
  primary: '#6366F1', // Indigo
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  
  // Secondary Colors
  secondary: '#10B981', // Emerald
  secondaryDark: '#059669',
  secondaryLight: '#34D399',
  
  // Disease Colors
  alzheimers: '#EF4444', // Red
  parkinsons: '#F59E0B', // Amber
  mci: '#3B82F6', // Blue
  vascular: '#8B5CF6', // Violet
  ftd: '#EC4899', // Pink
  lbd: '#14B8A6', // Teal
  
  // Neutral Colors
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  
  // Text Colors
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Border & Divider
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const DISEASES = [
  {
    id: 'alzheimers',
    name: "Alzheimer's Disease",
    shortName: 'Alzheimer\'s',
    color: COLORS.alzheimers,
    icon: '🧠',
    description: 'Progressive memory loss and cognitive decline',
  },
  {
    id: 'parkinsons',
    name: "Parkinson's Disease",
    shortName: 'Parkinson\'s',
    color: COLORS.parkinsons,
    icon: '🤝',
    description: 'Movement disorder affecting coordination',
  },
  {
    id: 'mci',
    name: 'Mild Cognitive Impairment',
    shortName: 'MCI',
    color: COLORS.mci,
    icon: '💭',
    description: 'Early stage cognitive changes',
  },
  {
    id: 'vascular',
    name: 'Vascular Dementia',
    shortName: 'Vascular',
    color: COLORS.vascular,
    icon: '❤️',
    description: 'Cognitive decline due to reduced blood flow',
  },
  {
    id: 'ftd',
    name: 'Frontotemporal Dementia',
    shortName: 'FTD',
    color: COLORS.ftd,
    icon: '🎭',
    description: 'Affects behavior and language',
  },
  {
    id: 'lbd',
    name: 'Lewy Body Dementia',
    shortName: 'LBD',
    color: COLORS.lbd,
    icon: '👁️',
    description: 'Causes visual hallucinations and fluctuating cognition',
  },
];
