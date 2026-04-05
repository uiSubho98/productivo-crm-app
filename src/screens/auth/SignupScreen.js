import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { authAPI } from '../../services/api';
import { Button, Input } from '../../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const otpRefs = useRef([]);
  const [shake] = useState(new Animated.Value(0));

  const { signupVerifyOtp, isLoading } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleRequestOtp = async () => {
    setEmailError('');
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address');
      doShake();
      return;
    }
    setSending(true);
    try {
      await authAPI.signupRequestOtp({ email: email.toLowerCase().trim() });
      setStep('otp');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send OTP';
      setEmailError(msg);
      doShake();
    }
    setSending(false);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 filled
    if (value && index === 5) {
      const code = [...next].join('');
      if (code.length === 6) submitOtp(code);
    }
  };

  const handleOtpKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (code) => {
    if ((code || otp.join('')).length < 6) {
      setOtpError('Enter the 6-digit OTP from your email');
      return;
    }
    const finalCode = code || otp.join('');
    const result = await signupVerifyOtp(email.toLowerCase().trim(), finalCode);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is handled by the navigator reacting to auth state change (token set)
      // But we also need to navigate to SetupOrg — navigate from within navigator
      navigation.replace('SetupOrg');
    } else {
      setOtpError(result.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      doShake();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 68, height: 68, borderRadius: 20, backgroundColor: '#2563EB',
              alignItems: 'center', justifyContent: 'center', marginBottom: 18,
              shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
            }}>
              <Ionicons name="flash" size={32} color="#FFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
              {step === 'email' ? 'Create free account' : 'Check your email'}
            </Text>
            <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 6, textAlign: 'center' }}>
              {step === 'email'
                ? 'No credit card required'
                : `We sent a 6-digit code to\n${email}`}
            </Text>
          </View>

          {/* Step 1: Email */}
          {step === 'email' && (
            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              {emailError ? (
                <View style={{
                  padding: 14, borderRadius: 12, marginBottom: 16,
                  backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
                }}>
                  <Text style={{ fontSize: 14, color: '#DC2626' }}>{emailError}</Text>
                </View>
              ) : null}

              <Input
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                isDark={isDark}
                style={{ marginBottom: 20 }}
              />

              <Button onPress={handleRequestOtp} loading={sending} size="lg" isDark={isDark}>
                Continue with Email
              </Button>
            </Animated.View>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <View>
              {otpError ? (
                <Animated.View style={{
                  transform: [{ translateX: shake }],
                  padding: 14, borderRadius: 12, marginBottom: 16,
                  backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
                }}>
                  <Text style={{ fontSize: 14, color: '#DC2626', textAlign: 'center' }}>{otpError}</Text>
                </Animated.View>
              ) : null}

              {/* 6 OTP boxes */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(i, v)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    autoFocus={i === 0}
                    style={{
                      width: 46, height: 56,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: otpError ? '#F87171' : digit ? C.primary : C.border,
                      backgroundColor: C.card,
                      color: C.text,
                      fontSize: 22,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  />
                ))}
              </View>

              <Button
                onPress={() => submitOtp(null)}
                loading={isLoading}
                size="lg"
                isDark={isDark}
                style={{ marginBottom: 20 }}
              >
                Verify & Create Account
              </Button>

              <View style={{ alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={handleRequestOtp} disabled={sending}>
                  <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600' }}>
                    {sending ? 'Sending...' : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setOtpError(''); }}>
                  <Text style={{ fontSize: 13, color: C.textSecondary }}>Change email</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Back to login */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 36, gap: 4 }}>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ fontSize: 14, color: C.primary, fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
