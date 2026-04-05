import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getInitials, getAvatarColor } from '../utils/format';
import { getColors } from '../utils/colors';

// ─── Button ──────────────────────────────────────────────────────────
export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  isDark,
}) {
  const C = getColors(isDark);
  const sizeStyles = {
    sm: { paddingVertical: 7, paddingHorizontal: 14, fontSize: 13, borderRadius: 10 },
    md: { paddingVertical: 11, paddingHorizontal: 20, fontSize: 14, borderRadius: 12 },
    lg: { paddingVertical: 15, paddingHorizontal: 24, fontSize: 16, borderRadius: 14 },
  };
  const s = sizeStyles[size] || sizeStyles.md;

  const base = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: s.paddingVertical,
    paddingHorizontal: s.paddingHorizontal,
    borderRadius: s.borderRadius,
    opacity: disabled || loading ? 0.6 : 1,
  };

  const variants = {
    primary: { backgroundColor: C.primary },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: C.danger },
  };

  const textColors = {
    primary: '#FFFFFF',
    outline: C.text,
    ghost: C.textSecondary,
    danger: '#FFFFFF',
  };

  return (
    <TouchableOpacity
      style={[base, variants[variant], style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={s.fontSize + 1} color={textColors[variant]} />}
          <Text style={{ fontSize: s.fontSize, fontWeight: '600', color: textColors[variant] }}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ───────────────────────────────────────────────────────────
export function Input({
  label,
  icon,
  error,
  secureTextEntry,
  isDark,
  style,
  inputStyle,
  ...props
}) {
  const [showPass, setShowPass] = useState(false);
  const C = getColors(isDark);
  const isPassword = secureTextEntry;

  return (
    <View style={style}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.inputBg,
          borderWidth: 1.5,
          borderColor: error ? C.danger : C.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 13 : 10,
        }}
      >
        {icon && (
          <Ionicons name={icon} size={18} color={C.textTertiary} style={{ marginRight: 10 }} />
        )}
        <TextInput
          style={[
            {
              flex: 1,
              fontSize: 15,
              color: C.text,
              padding: 0,
            },
            inputStyle,
          ]}
          placeholderTextColor={C.placeholder}
          secureTextEntry={isPassword && !showPass}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Ionicons
              name={showPass ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={C.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}

// ─── PhoneInput ──────────────────────────────────────────────────────
// Displays a fixed +91 prefix and only allows up to 10 digits.
export function PhoneInput({ label, value, onChange, isDark, style, error }) {
  const C = getColors(isDark);
  const handleChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  };
  return (
    <View style={style}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 }}>{label}</Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderWidth: 1.5,
        borderColor: error ? C.danger : C.inputBorder, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
      }}>
        <Ionicons name="call-outline" size={18} color={C.textTertiary} style={{ marginRight: 8 }} />
        <View style={{
          paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
          backgroundColor: C.primary + '20', marginRight: 8,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>+91</Text>
        </View>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: C.text, padding: 0 }}
          placeholderTextColor={C.placeholder}
          placeholder="98765 43210"
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={10}
        />
        {value?.length > 0 && (
          <Text style={{ fontSize: 11, color: value.length === 10 ? '#10B981' : C.textTertiary, fontWeight: '600' }}>
            {value.length}/10
          </Text>
        )}
      </View>
      {error && <Text style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, isDark, padding = true }) {
  const C = getColors(isDark);
  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...(padding ? { padding: 16 } : {}),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

// ─── Avatar ──────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md', style }) {
  const sizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };
  const px = sizes[size] || sizes.md;
  const fontSize = px * 0.38;
  const bg = getAvatarColor(name);

  return (
    <View
      style={[
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────
const BADGE_PRESETS = {
  todo: { bg: '#F1F5F9', text: '#475569' },
  backlog: { bg: '#EEF2FF', text: '#4F46E5' },
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8' },
  in_review: { bg: '#F5F3FF', text: '#6D28D9' },
  done: { bg: '#ECFDF5', text: '#065F46' },
  completed: { bg: '#ECFDF5', text: '#065F46' },
  low: { bg: '#F8FAFC', text: '#64748B' },
  medium: { bg: '#FFFBEB', text: '#B45309' },
  high: { bg: '#FFF7ED', text: '#C2410C' },
  urgent: { bg: '#FEF2F2', text: '#B91C1C' },
  lead: { bg: '#F1F5F9', text: '#475569' },
  contacted: { bg: '#EFF6FF', text: '#1D4ED8' },
  quotation_sent: { bg: '#FFFBEB', text: '#B45309' },
  quotation_revised: { bg: '#FFF7ED', text: '#C2410C' },
  mvp_shared: { bg: '#F5F3FF', text: '#6D28D9' },
  converted: { bg: '#ECFDF5', text: '#065F46' },
  lost: { bg: '#FEF2F2', text: '#B91C1C' },
  draft: { bg: '#F1F5F9', text: '#475569' },
  sent: { bg: '#EFF6FF', text: '#1D4ED8' },
  paid: { bg: '#ECFDF5', text: '#065F46' },
  overdue: { bg: '#FEF2F2', text: '#B91C1C' },
  cancelled: { bg: '#F1F5F9', text: '#6B7280' },
  scheduled: { bg: '#EFF6FF', text: '#1D4ED8' },
  in_progress_meeting: { bg: '#FFFBEB', text: '#B45309' },
  planning: { bg: '#F5F3FF', text: '#6D28D9' },
  active: { bg: '#ECFDF5', text: '#065F46' },
  on_hold: { bg: '#FFFBEB', text: '#B45309' },
};

export function Badge({ status, children, style }) {
  const preset = BADGE_PRESETS[status] || { bg: '#F1F5F9', text: '#475569' };
  const label = children || (status ? status.replace(/_/g, ' ') : '');

  return (
    <View
      style={[
        {
          backgroundColor: preset.bg,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: preset.text, textTransform: 'capitalize' }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────
export function Spinner({ size = 'md', color }) {
  const sizes = { sm: 'small', md: 'large', lg: 'large' };
  return <ActivityIndicator size={sizes[size] || 'large'} color={color || '#2563EB'} />;
}

// ─── Empty State ──────────────────────────────────────────────────────
export function EmptyState({ icon = 'cube-outline', title, subtitle, actionLabel, onAction, isDark }) {
  const C = getColors(isDark);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: C.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={32} color={C.textTertiary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} isDark={isDark}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

// ─── Modal Wrapper ─────────────────────────────────────────────────────
export function AppModal({ isOpen, onClose, title, children, isDark, size = 'md' }) {
  const C = getColors(isDark);
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{
          backgroundColor: C.card,
          borderRadius: 20,
          padding: 24,
          maxWidth: size === 'sm' ? 340 : 500,
          alignSelf: 'center',
          width: '100%',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{
              width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="close" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Section Header ───────────────────────────────────────────────────
export function SectionHeader({ title, actionLabel, onAction, isDark }) {
  const C = getColors(isDark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────
export function SearchInput({ value, onChangeText, placeholder, isDark, style }) {
  const C = getColors(isDark);
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 11 : 8,
      gap: 8,
    }, style]}>
      <Ionicons name="search" size={18} color={C.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search...'}
        placeholderTextColor={C.placeholder}
        style={{ flex: 1, fontSize: 15, color: C.text, padding: 0 }}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={C.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Tab Switcher ─────────────────────────────────────────────────────
export function TabSwitcher({ tabs, activeTab, onTabChange, isDark, style }) {
  const C = getColors(isDark);
  return (
    <View style={[{
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 3,
    }, style]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          onPress={() => onTabChange(tab.value)}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: activeTab === tab.value ? C.card : 'transparent',
            ...(activeTab === tab.value ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
            } : {}),
          }}
        >
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: activeTab === tab.value ? C.text : C.textSecondary,
          }}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Filter Chip ───────────────────────────────────────────────────────
export function FilterChip({ label, active, onPress, isDark }) {
  const C = getColors(isDark);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: active ? C.primary : C.surface,
        borderWidth: active ? 0 : 1,
        borderColor: C.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFF' : C.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = 'blue', onPress, isDark }) {
  const C = getColors(isDark);
  const colorMap = {
    blue: { bg: C.primaryLight, icon: C.primary },
    green: { bg: '#ECFDF5', icon: '#059669' },
    yellow: { bg: '#FFFBEB', icon: '#D97706' },
    red: { bg: '#FEF2F2', icon: '#DC2626' },
    purple: { bg: '#F5F3FF', icon: '#7C3AED' },
    indigo: { bg: '#EEF2FF', icon: '#4338CA' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card onPress={onPress} isDark={isDark} style={{ flex: 1, minWidth: 140 }}>
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
      }}>
        <Ionicons name={icon} size={22} color={c.icon} />
      </View>
      <Text style={{ fontSize: String(value).length > 10 ? 14 : String(value).length > 7 ? 17 : 22, fontWeight: '800', color: C.text, marginBottom: 2 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '500' }}>{label}</Text>
      {sub && <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{sub}</Text>}
    </Card>
  );
}

// ─── Mini Progress Bar ────────────────────────────────────────────────
export function ProgressBar({ label, value, max, color = '#3B82F6', isDark }) {
  const C = getColors(isDark);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: C.textSecondary, width: 80 }} numberOfLines={1}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: C.surface, borderRadius: 3 }}>
        <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.text, width: 24, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, onMenuPress, actionIcon, onAction, isDark, backButton, onBack }) {
  const C = getColors(isDark);
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 16,
      gap: 12,
    }}>
      {backButton ? (
        <TouchableOpacity
          onPress={onBack}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      ) : onMenuPress ? (
        <TouchableOpacity
          onPress={onMenuPress}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="menu" size={20} color={C.text} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {actionIcon && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: C.primary,
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: 12,
          }}
        >
          <Ionicons name={actionIcon} size={16} color="#FFF" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>New</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Picker helpers ───────────────────────────────────────────────────
const ITEM_H = 44;
const VISIBLE = 5;

function WheelColumn({ data, selectedIndex, onSelect, formatLabel, isDark }) {
  const C = getColors(isDark);
  const ref = useRef(null);
  const [internalIndex, setInternalIndex] = useState(selectedIndex);

  useEffect(() => {
    setInternalIndex(selectedIndex);
    if (ref.current) {
      ref.current.scrollToIndex({ index: selectedIndex, animated: false });
    }
  }, [selectedIndex]);

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setInternalIndex(clamped);
    onSelect(data[clamped]);
  };

  const height = ITEM_H * VISIBLE;
  const pad = Math.floor(VISIBLE / 2);
  const paddedData = [...Array(pad).fill(null), ...data, ...Array(pad).fill(null)];

  return (
    <View style={{ width: 80, height, overflow: 'hidden' }}>
      <View style={{
        position: 'absolute', top: ITEM_H * pad, left: 4, right: 4, height: ITEM_H,
        borderRadius: 10, backgroundColor: C.primary + '22',
        borderWidth: 1.5, borderColor: C.primary + '55',
      }} pointerEvents="none" />
      <FlatList
        ref={ref}
        data={paddedData}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        initialScrollIndex={pad + selectedIndex}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item, index }) => {
          const realIdx = index - pad;
          const isSelected = realIdx === internalIndex;
          return (
            <View style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              {item !== null && (
                <Text style={{
                  fontSize: isSelected ? 18 : 15,
                  fontWeight: isSelected ? '700' : '400',
                  color: isSelected ? C.primary : C.textSecondary,
                }}>
                  {formatLabel ? formatLabel(item) : String(item).padStart(2, '0')}
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────
export function DatePicker({ label, value, onChange, isDark, style, placeholder = 'Select date' }) {
  const C = getColors(isDark);
  const [open, setOpen] = useState(false);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today = new Date();

  const parseDate = (v) => {
    const d = v ? new Date(v + 'T00:00:00') : today;
    return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() };
  };
  const { y: initY, mo: initMo, d: initD } = parseDate(value);
  const [selY, setSelY] = useState(initY);
  const [selMo, setSelMo] = useState(initMo);
  const [selD, setSelD] = useState(initD);

  const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 1 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const daysInMonth = new Date(selY, selMo + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const clampedD = Math.min(selD, daysInMonth);

  const displayValue = value
    ? (() => { const { y, mo, d } = parseDate(value); return `${String(d).padStart(2,'0')} ${MONTHS[mo]} ${y}`; })()
    : '';

  const handleOpen = () => {
    const p = parseDate(value);
    setSelY(p.y); setSelMo(p.mo); setSelD(p.d);
    setOpen(true);
  };

  const handleConfirm = () => {
    const d = Math.min(clampedD, new Date(selY, selMo + 1, 0).getDate());
    onChange(`${selY}-${String(selMo + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setOpen(false);
  };

  return (
    <View style={style}>
      {label && <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 }}>{label}</Text>}
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.75} style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
      }}>
        <Ionicons name="calendar-outline" size={17} color={C.textSecondary} />
        <Text style={{ flex: 1, fontSize: 14, color: displayValue ? C.text : C.placeholder }}>{displayValue || placeholder}</Text>
        <Ionicons name="chevron-down" size={15} color={C.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 16 }}>{label || 'Select Date'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              {['Day','Month','Year'].map(h => (
                <View key={h} style={{ width: 80, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              <WheelColumn data={days} selectedIndex={Math.max(0, days.indexOf(clampedD))} onSelect={setSelD} isDark={isDark} />
              <WheelColumn data={months} selectedIndex={selMo} onSelect={setSelMo} formatLabel={(v) => MONTHS[v]} isDark={isDark} />
              <WheelColumn data={years} selectedIndex={Math.max(0, years.indexOf(selY))} onSelect={setSelY} isDark={isDark} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────
export function TimePicker({ label, value, onChange, isDark, style, placeholder = 'Select time' }) {
  const C = getColors(isDark);
  const [open, setOpen] = useState(false);

  const parseTime = (v) => {
    if (!v) { const n = new Date(); return { h: n.getHours(), m: 0 }; }
    const [hh, mm] = v.split(':').map(Number);
    return { h: isNaN(hh) ? 0 : hh, m: isNaN(mm) ? 0 : mm };
  };
  const { h: initH, m: initM } = parseTime(value);
  const [selH, setSelH] = useState(initH);
  const [selM, setSelM] = useState(initM);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const displayValue = value ? `${String(initH).padStart(2,'0')}:${String(initM).padStart(2,'0')}` : '';

  const handleOpen = () => {
    const { h, m } = parseTime(value);
    setSelH(h); setSelM(m);
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(`${String(selH).padStart(2,'0')}:${String(selM).padStart(2,'0')}`);
    setOpen(false);
  };

  return (
    <View style={style}>
      {label && <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 }}>{label}</Text>}
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.75} style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
      }}>
        <Ionicons name="time-outline" size={17} color={C.textSecondary} />
        <Text style={{ flex: 1, fontSize: 14, color: displayValue ? C.text : C.placeholder }}>{displayValue || placeholder}</Text>
        <Ionicons name="chevron-down" size={15} color={C.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 16 }}>{label || 'Select Time'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              {['Hour','Minute'].map(h => (
                <View key={h} style={{ width: 80, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              <WheelColumn data={hours} selectedIndex={selH} onSelect={setSelH} isDark={isDark} />
              <WheelColumn data={minutes} selectedIndex={selM} onSelect={setSelM} isDark={isDark} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
