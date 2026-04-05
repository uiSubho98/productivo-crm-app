export const Colors = {
  light: {
    background: '#F9FAFB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    primaryBg: '#DBEAFE',
    sidebar: '#FFFFFF',
    inputBg: '#FFFFFF',
    inputBorder: '#D1D5DB',
    placeholder: '#9CA3AF',
    surface: '#F3F4F6',
    surfaceHover: '#F9FAFB',
    danger: '#DC2626',
    dangerLight: '#FEF2F2',
    success: '#059669',
    successLight: '#ECFDF5',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    purple: '#7C3AED',
    purpleLight: '#EDE9FE',
  },
  dark: {
    background: '#030712',
    card: '#111827',
    border: '#1F2937',
    borderLight: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    primary: '#3B82F6',
    primaryLight: '#1E3A5F',
    primaryBg: '#1E3A8A',
    sidebar: '#111827',
    inputBg: '#1F2937',
    inputBorder: '#374151',
    placeholder: '#6B7280',
    surface: '#1F2937',
    surfaceHover: '#374151',
    danger: '#EF4444',
    dangerLight: '#2A0F0F',
    success: '#10B981',
    successLight: '#052E16',
    warning: '#F59E0B',
    warningLight: '#1C1000',
    purple: '#8B5CF6',
    purpleLight: '#1E1040',
  },
};

export const getColors = (isDark) => (isDark ? Colors.dark : Colors.light);

export const StatusColors = {
  backlog: { bg: '#EEF2FF', text: '#4F46E5', dot: '#818CF8' },
  todo: { bg: '#F8FAFC', text: '#475569', dot: '#94A3B8' },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#60A5FA' },
  in_review: { bg: '#F5F3FF', text: '#6D28D9', dot: '#C084FC' },
  done: { bg: '#ECFDF5', text: '#065F46', dot: '#34D399' },
  completed: { bg: '#ECFDF5', text: '#065F46', dot: '#34D399' },
};

export const StatusColorsDark = {
  backlog: { bg: '#1E1B4B', text: '#A5B4FC', dot: '#818CF8' },
  todo: { bg: '#1E293B', text: '#94A3B8', dot: '#94A3B8' },
  in_progress: { bg: '#1E3A5F', text: '#93C5FD', dot: '#60A5FA' },
  in_review: { bg: '#2E1065', text: '#DDD6FE', dot: '#C084FC' },
  done: { bg: '#052E16', text: '#6EE7B7', dot: '#34D399' },
  completed: { bg: '#052E16', text: '#6EE7B7', dot: '#34D399' },
};

export const PriorityColors = {
  low: { color: '#94A3B8', icon: 'arrow-down' },
  medium: { color: '#F59E0B', icon: 'minus' },
  high: { color: '#F97316', icon: 'arrow-up' },
  urgent: { color: '#EF4444', icon: 'flame' },
};

export const PipelineColors = {
  lead: '#94A3B8',
  contacted: '#3B82F6',
  quotation_sent: '#F59E0B',
  quotation_revised: '#F97316',
  mvp_shared: '#8B5CF6',
  converted: '#10B981',
  lost: '#EF4444',
  inactive: '#6B7280',
};
