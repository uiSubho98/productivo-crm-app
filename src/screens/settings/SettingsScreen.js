import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { authAPI, categoryAPI, locationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Input, Button, Avatar, AppModal, ScreenHeader } from '../../components/ui';

// ─── MPIN Setup Modal ──────────────────────────────────────────────────
function MpinModal({ visible, onClose, isDark }) {
  const C = getColors(isDark);
  const [mpin, setMpin] = useState('');
  const [mpinConfirm, setMpinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    if (mpin.length !== 4) { setError('MPIN must be exactly 4 digits'); return; }
    if (!/^\d+$/.test(mpin)) { setError('MPIN must be numeric'); return; }
    if (mpin !== mpinConfirm) { setError('MPINs do not match'); return; }
    setLoading(true);
    try {
      await authAPI.setupMpin({ mpin });
      await SecureStore.setItemAsync('mpin_enabled', 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('MPIN Set', 'Your MPIN has been set up successfully. You can now use it to login.');
      onClose();
      setMpin('');
      setMpinConfirm('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set MPIN');
    }
    setLoading(false);
  };

  return (
    <AppModal isOpen={visible} onClose={onClose} title="Setup MPIN" isDark={isDark} size="sm">
      {error && (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#FEF2F2', marginBottom: 14 }}>
          <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
        </View>
      )}
      <Input
        label="Enter MPIN (4 digits)"
        icon="lock-closed-outline"
        placeholder="••••"
        value={mpin}
        onChangeText={(v) => setMpin(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        isDark={isDark}
        style={{ marginBottom: 14 }}
      />
      <Input
        label="Confirm MPIN"
        icon="lock-closed-outline"
        placeholder="••••"
        value={mpinConfirm}
        onChangeText={(v) => setMpinConfirm(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        isDark={isDark}
        style={{ marginBottom: 20 }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="outline" onPress={onClose} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
        <Button onPress={handleSave} loading={loading} isDark={isDark} style={{ flex: 1 }}>Save</Button>
      </View>
    </AppModal>
  );
}

// ─── Add Category Modal ───────────────────────────────────────────────
function AddCategoryModal({ visible, onClose, onAdd, isDark }) {
  const C = getColors(isDark);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name.trim());
    setLoading(false);
    setName('');
    onClose();
  };

  return (
    <AppModal isOpen={visible} onClose={onClose} title="New Category" isDark={isDark} size="sm">
      <Input
        label="Category Name"
        placeholder="e.g. Backend, Design..."
        value={name}
        onChangeText={setName}
        isDark={isDark}
        style={{ marginBottom: 20 }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="outline" onPress={onClose} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
        <Button onPress={handleAdd} loading={loading} isDark={isDark} style={{ flex: 1 }}>Add</Button>
      </View>
    </AppModal>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { isDark, mode, setMode } = useThemeStore();
  const C = getColors(isDark);

  const [showMpinModal, setShowMpinModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [mpinEnabled, setMpinEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [locationUsage, setLocationUsage] = useState(null);

  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    fetchCategories();
    checkBiometrics();
    loadMpinStatus();
    loadBiometricStatus();
    if (isSuperAdmin) fetchLocationUsage();
  }, []);

  const fetchLocationUsage = async () => {
    try {
      const res = await locationAPI.getUsage();
      setLocationUsage(res.data?.data || null);
    } catch {}
  };

  const loadMpinStatus = async () => {
    const val = await SecureStore.getItemAsync('mpin_enabled');
    setMpinEnabled(val === 'true');
  };

  const loadBiometricStatus = async () => {
    const val = await SecureStore.getItemAsync('biometric_enabled');
    setBiometricEnabled(val === 'true');
  };

  const handleToggleBiometric = async (value) => {
    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify to enable biometric login',
          cancelLabel: 'Cancel',
        });
        if (!result.success) return;
      } catch { return; }
    }
    await SecureStore.setItemAsync('biometric_enabled', value ? 'true' : 'false');
    setBiometricEnabled(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setBiometricAvailable(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else {
          setBiometricType('Fingerprint');
        }
      }
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleAddCategory = async (name) => {
    try {
      await categoryAPI.create({ name });
      fetchCategories();
    } catch {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleDeleteCategory = (id, name) => {
    Alert.alert('Delete Category', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoryAPI.delete(id);
            fetchCategories();
          } catch {}
        },
      },
    ]);
  };

  const handleClearMpin = async () => {
    Alert.alert('Clear MPIN', 'Disable MPIN login?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.setItemAsync('mpin_enabled', 'false');
          setMpinEnabled(false);
        },
      },
    ]);
  };

  const THEME_OPTIONS = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'system', label: 'System', icon: 'desktop-outline' },
  ];

  const SettingRow = ({ icon, iconColor = C.textSecondary, title, subtitle, rightEl, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: iconColor + '18',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      {rightEl || (onPress && <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 20 }}>Settings</Text>

        {/* Profile */}
        <View style={{
          backgroundColor: C.card,
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}>
          <Avatar name={user?.name} size="lg" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{user?.name || 'User'}</Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{user?.email}</Text>
            <View style={{
              alignSelf: 'flex-start', marginTop: 6,
              backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'capitalize' }}>
                {(user?.role || 'employee').replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 }}>
            Appearance
          </Text>
          <View style={{
            backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
          }}>
            <View style={{ padding: 16, flexDirection: 'row', gap: 10 }}>
              {THEME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: mode === opt.value ? C.primary : C.surface,
                    borderWidth: 1,
                    borderColor: mode === opt.value ? C.primary : C.border,
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={mode === opt.value ? '#FFF' : C.textSecondary}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: mode === opt.value ? '#FFF' : C.textSecondary }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 }}>
            Security
          </Text>
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <SettingRow
              icon="lock-closed-outline"
              iconColor={C.primary}
              title={mpinEnabled ? 'Change MPIN' : 'Set Up MPIN'}
              subtitle={mpinEnabled ? 'MPIN login is enabled' : 'Use a PIN for quick login'}
              onPress={() => setShowMpinModal(true)}
            />
            {mpinEnabled && (
              <>
                <View style={{ height: 1, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
                <SettingRow
                  icon="lock-open-outline"
                  iconColor={C.danger}
                  title="Disable MPIN"
                  subtitle="Remove MPIN login"
                  onPress={handleClearMpin}
                />
              </>
            )}
            {biometricAvailable && (
              <>
                <View style={{ height: 1, backgroundColor: C.borderLight, marginHorizontal: 16 }} />
                <SettingRow
                  icon="finger-print-outline"
                  iconColor="#059669"
                  title={`${biometricType || 'Biometric'} Login`}
                  subtitle={biometricEnabled ? 'Enabled — use biometrics to sign in' : 'Tap to enable biometric login'}
                  rightEl={
                    <Switch
                      value={biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      trackColor={{ false: C.border, true: '#059669' }}
                      thumbColor="#FFF"
                    />
                  }
                />
              </>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Task Categories
            </Text>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: C.primaryLight,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Ionicons name="add" size={16} color={C.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            {categories.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Ionicons name="pricetag-outline" size={28} color={C.textTertiary} />
                <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 8 }}>No categories yet</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(true)} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>Add your first category</Text>
                </TouchableOpacity>
              </View>
            ) : (
              categories.map((cat, idx) => (
                <View key={cat._id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < categories.length - 1 ? 1 : 0,
                  borderBottomColor: C.borderLight,
                }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 9,
                    backgroundColor: '#F5F3FF',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="pricetag-outline" size={17} color="#7C3AED" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: C.text }}>{cat.name}</Text>
                  {cat.isDefault ? (
                    <View style={{ backgroundColor: C.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '500' }}>Default</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat._id, cat.name)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: '#FEF2F2',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Location API Usage — superadmin only */}
        {isSuperAdmin && locationUsage && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Location API Usage
              </Text>
              <TouchableOpacity onPress={fetchLocationUsage} style={{ padding: 4 }}>
                <Ionicons name="refresh-outline" size={16} color={C.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Country State City */}
            <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="map-outline" size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Country State City API</Text>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>State &amp; city lookups · Free tier</Text>
                </View>
                {/* Health badge */}
                {(() => {
                  const pct = locationUsage.csc.monthCount / locationUsage.csc.monthlyLimit;
                  const label = pct >= 0.9 ? 'Critical' : pct >= 0.7 ? 'Warning' : 'Healthy';
                  const bg = pct >= 0.9 ? '#FEE2E2' : pct >= 0.7 ? '#FEF3C7' : '#DCFCE7';
                  const color = pct >= 0.9 ? '#DC2626' : pct >= 0.7 ? '#D97706' : '#16A34A';
                  return (
                    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Meters */}
              {[
                { label: 'Today', used: locationUsage.csc.dayCount, limit: locationUsage.csc.dailyLimit },
                { label: 'This Month', used: locationUsage.csc.monthCount, limit: locationUsage.csc.monthlyLimit },
              ].map(({ label, used, limit }) => {
                const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
                const barColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#3B82F6';
                return (
                  <View key={label} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>{label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{used} / {limit}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: C.inputBorder, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{pct.toFixed(1)}% used</Text>
                  </View>
                );
              })}

              {/* Stats row */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12 }}>
                {[
                  { val: locationUsage.csc.cacheHits, lbl: 'Cache hits' },
                  { val: `${locationUsage.csc.cacheSize}/36`, lbl: 'States cached' },
                  { val: locationUsage.csc.monthlyLimit - locationUsage.csc.monthCount, lbl: 'Left / mo' },
                ].map(({ val, lbl }) => (
                  <View key={lbl} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{val}</Text>
                    <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{lbl}</Text>
                  </View>
                ))}
              </View>

              {/* Limits info */}
              <View style={{ marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 }}>Free tier limits</Text>
                <Text style={{ fontSize: 11, color: '#2563EB' }}>• 3,000 requests / month</Text>
                <Text style={{ fontSize: 11, color: '#2563EB' }}>• 100 requests / day</Text>
                <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 3 }}>✓ City results cached — each state fetched only once</Text>
              </View>
            </View>

            {/* LocationIQ */}
            <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="location-outline" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>LocationIQ</Text>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>Static map tiles · Free tier</Text>
                </View>
                {(() => {
                  const pct = locationUsage.locationiq.dayCount / locationUsage.locationiq.dailyLimit;
                  const label = pct >= 0.9 ? 'Critical' : pct >= 0.7 ? 'Warning' : 'Healthy';
                  const bg = pct >= 0.9 ? '#FEE2E2' : pct >= 0.7 ? '#FEF3C7' : '#DCFCE7';
                  const color = pct >= 0.9 ? '#DC2626' : pct >= 0.7 ? '#D97706' : '#16A34A';
                  return (
                    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Daily meter */}
              {(() => {
                const pct = Math.min((locationUsage.locationiq.dayCount / locationUsage.locationiq.dailyLimit) * 100, 100);
                const barColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#7C3AED';
                return (
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>Today</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>
                        {locationUsage.locationiq.dayCount} / {locationUsage.locationiq.dailyLimit}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: C.inputBorder, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{pct.toFixed(1)}% of daily limit</Text>
                  </View>
                );
              })()}

              {/* Rate boxes */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                {[
                  { label: 'This minute', used: locationUsage.locationiq.minuteCount, limit: locationUsage.locationiq.minuteLimit, sublabel: '60 req / min' },
                  { label: 'Last second', used: locationUsage.locationiq.secondCount, limit: locationUsage.locationiq.secondLimit, sublabel: '2 req / sec' },
                ].map(({ label, used, limit, sublabel }) => {
                  const pct = Math.min((used / limit) * 100, 100);
                  const barColor = pct >= 100 ? '#EF4444' : '#7C3AED';
                  return (
                    <View key={label} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, color: C.textSecondary }}>{label}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>{used}/{limit}</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: C.inputBorder, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 4 }}>{sublabel}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Limits info */}
              <View style={{ backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#5B21B6', marginBottom: 4 }}>Free tier limits</Text>
                <Text style={{ fontSize: 11, color: '#7C3AED' }}>• 5,000 requests / day</Text>
                <Text style={{ fontSize: 11, color: '#7C3AED' }}>• 60 requests / minute</Text>
                <Text style={{ fontSize: 11, color: '#7C3AED' }}>• 2 requests / second</Text>
              </View>
            </View>
          </View>
        )}

        {/* App Info */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 14, backgroundColor: '#2563EB',
            alignItems: 'center', justifyContent: 'center', marginBottom: 8,
          }}>
            <Ionicons name="flash" size={24} color="#FFF" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>Productivo</Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>Version 1.0.0</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
            ]);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FECACA',
            marginBottom: 8,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#DC2626' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <MpinModal visible={showMpinModal} onClose={() => { setShowMpinModal(false); loadMpinStatus(); }} isDark={isDark} />
      <AddCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onAdd={handleAddCategory}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
