import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Input, Button } from '../../components/ui';

const { width } = Dimensions.get('window');
const KEY_SIZE = 68;

// ─── Banking-style PIN dots ───────────────────────────────────────────
function PinDots({ value, shake }) {
  return (
    <Animated.View style={{
      flexDirection: 'row',
      gap: 20,
      justifyContent: 'center',
      marginVertical: 36,
      transform: [{ translateX: shake }],
    }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: i < value.length ? '#FFFFFF' : 'transparent',
            borderWidth: 2,
            borderColor: i < value.length ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
          }}
        />
      ))}
    </Animated.View>
  );
}

// ─── Banking keypad ───────────────────────────────────────────────────
function KeyPad({ onPress, onDelete, onBiometric, biometricIcon }) {
  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['bio','0','del']];

  return (
    <View style={{ paddingHorizontal: 40, gap: 10 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {row.map((key, ki) => {
            if (key === 'bio') {
              return (
                <TouchableOpacity
                  key={ki}
                  onPress={onBiometric ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onBiometric(); } : undefined}
                  style={{
                    width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: onBiometric ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderWidth: onBiometric ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.15)',
                  }}
                  activeOpacity={0.7}
                >
                  {onBiometric && <Ionicons name={biometricIcon || 'finger-print-outline'} size={32} color="rgba(255,255,255,0.8)" />}
                </TouchableOpacity>
              );
            }
            if (key === 'del') {
              return (
                <TouchableOpacity
                  key={ki}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDelete(); }}
                  style={{
                    width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="backspace-outline" size={28} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ki}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(key); }}
                style={{
                  width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                activeOpacity={0.5}
              >
                <Text style={{ fontSize: 24, fontWeight: '400', color: '#FFFFFF' }}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'pin' | 'password'
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savedName, setSavedName] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [mpinEnabled, setMpinEnabled] = useState(false);
  const [shake] = useState(new Animated.Value(0));

  const { login, isLoading, error, clearError } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  // Store biometric availability in a ref so it can be used in init() before state settles
  const bioAvailableRef = useRef(false);

  useEffect(() => {
    init();
  }, []);

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  // Standalone biometric function (not useCallback — defined before init call)
  const doBiometric = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Productivo',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await loginWithStoredSession(token);
      }
    } catch {}
  };

  const loginWithStoredSession = async (token) => {
    try {
      const storedUser = await SecureStore.getItemAsync('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (user && token) {
        useAuthStore.setState({ user, token, isInitialized: true, isLoading: false });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // No cached user — must fetch from server
        await useAuthStore.getState().initialize();
      }
    } catch {
      await useAuthStore.getState().initialize();
    }
  };

  const init = async () => {
    // 1. Check biometric hardware
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHw && enrolled) {
        bioAvailableRef.current = true;
        setBiometricAvailable(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType(
          types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'face' : 'fingerprint'
        );
      }
    } catch {}

    // 2. Load saved email/name for greeting
    try {
      const em = await SecureStore.getItemAsync('last_login_email');
      const nm = await SecureStore.getItemAsync('last_login_name');
      if (em) { setSavedEmail(em); setEmail(em); }
      if (nm) setSavedName(nm);
    } catch {}

    // 3. Decide which screen to show
    try {
      const mpinFlag = await SecureStore.getItemAsync('mpin_enabled');
      const token = await SecureStore.getItemAsync('token');

      if (mpinFlag === 'true') {
        // Always show PIN screen if MPIN was set up (even without token — they'll see error on submit)
        setMpinEnabled(true);
        setScreen('pin');
        // Auto-trigger biometric after screen renders
        if (bioAvailableRef.current && token) {
          setTimeout(doBiometric, 700);
        }
      } else {
        setScreen('password');
        // Show biometric button on password screen too if available + token exists
      }
    } catch {
      setScreen('password');
    }
  };

  const handlePinKey = (key) => {
    if (verifying || pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    setPinError('');
    if (next.length === 4) submitPin(next);
  };

  const handlePinDelete = () => {
    if (verifying) return;
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  const submitPin = async (p) => {
    setVerifying(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        setPin('');
        setPinError('No session found. Please use password to login first.');
        setVerifying(false);
        doShake();
        return;
      }
      const res = await useAuthStore.getState().verifyMpin(p);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // loginWithStoredSession handles navigation via authStore state change
        await loginWithStoredSession(token);
      } else {
        setPin('');
        setPinError(res.error || 'Wrong PIN. Try again.');
        doShake();
      }
    } catch (err) {
      setPin('');
      setPinError('Wrong PIN. Try again.');
      doShake();
    }
    setVerifying(false);
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    const result = await login(email.trim().toLowerCase(), password);
    if (result.success) {
      const user = useAuthStore.getState().user;
      await SecureStore.setItemAsync('last_login_email', email.trim().toLowerCase());
      if (user?.name) await SecureStore.setItemAsync('last_login_name', user.name);
    } else {
      doShake();
    }
  };

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Fingerprint';
  const firstName = savedName ? savedName.split(' ')[0] : '';

  // ─── Loading ───────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="flash" size={32} color="#FFF" />
        </View>
      </View>
    );
  }

  // ─── PIN Screen ────────────────────────────────────────────────────
  if (screen === 'pin') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 0 }}>

          {/* Top section: avatar + greeting + dots */}
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 22, backgroundColor: '#2563EB',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
            }}>
              <Ionicons name="flash" size={34} color="#FFF" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4 }}>
              {firstName ? `Hi, ${firstName}` : 'Welcome back'}
            </Text>
            {savedEmail ? (
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>
                {savedEmail}
              </Text>
            ) : null}
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
              Enter your 4-digit PIN
            </Text>

            {/* PIN dots */}
            <PinDots value={pin} shake={shake} />

            {/* Error / verifying */}
            <View style={{ height: 20, justifyContent: 'center' }}>
              {pinError ? (
                <Text style={{ fontSize: 13, color: '#F87171', textAlign: 'center', paddingHorizontal: 24 }}>{pinError}</Text>
              ) : verifying ? (
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Verifying...</Text>
              ) : null}
            </View>
          </View>

          {/* Keypad */}
          <View style={{ paddingBottom: 16 }}>
            <KeyPad
              onPress={handlePinKey}
              onDelete={handlePinDelete}
              onBiometric={biometricAvailable ? doBiometric : null}
              biometricIcon={biometricIcon}
            />
            {/* Use password link */}
            <TouchableOpacity
              onPress={() => { setPin(''); setPinError(''); setScreen('password'); }}
              style={{ alignItems: 'center', paddingVertical: 18 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', textDecorationLine: 'underline' }}>
                Use password instead
              </Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    );
  }

  // ─── Password Screen ───────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{
              width: 68, height: 68, borderRadius: 20, backgroundColor: '#2563EB',
              alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
            }}>
              <Ionicons name="flash" size={32} color="#FFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 6 }}>
              Sign in to Productivo
            </Text>
          </View>

          {error && (
            <Animated.View style={{
              transform: [{ translateX: shake }],
              padding: 14, borderRadius: 12, marginBottom: 16,
              backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
            }}>
              <Text style={{ fontSize: 14, color: '#DC2626' }}>{error}</Text>
            </Animated.View>
          )}

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError(); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            secureTextEntry
            isDark={isDark}
            style={{ marginBottom: 8 }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ alignSelf: 'flex-end', marginBottom: 24 }}
          >
            <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>Forgot password?</Text>
          </TouchableOpacity>

          <Button onPress={handlePasswordLogin} loading={isLoading} size="lg" isDark={isDark} style={{ marginBottom: 16 }}>
            Sign In
          </Button>

          {(mpinEnabled || biometricAvailable) && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                <Text style={{ fontSize: 12, color: C.textTertiary }}>or sign in with</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {mpinEnabled && (
                  <TouchableOpacity
                    onPress={() => { setPin(''); setPinError(''); setScreen('pin'); }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 8, paddingVertical: 14, borderRadius: 14,
                      borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
                    }}
                  >
                    <Ionicons name="keypad-outline" size={20} color={C.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>PIN Login</Text>
                  </TouchableOpacity>
                )}
                {biometricAvailable && (
                  <TouchableOpacity
                    onPress={doBiometric}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 8, paddingVertical: 14, borderRadius: 14,
                      borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
                    }}
                  >
                    <Ionicons name={biometricIcon} size={22} color={C.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{biometricLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
