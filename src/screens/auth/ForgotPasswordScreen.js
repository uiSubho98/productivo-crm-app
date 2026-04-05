import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Input, Button } from '../../components/ui';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.verifyOtp({ email: email.trim().toLowerCase(), otp });
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword({ email: email.trim().toLowerCase(), otp, newPassword });
      setSuccessMsg('Password reset successfully!');
      setTimeout(() => navigation.goBack(), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  const stepTitles = {
    email: { title: 'Forgot Password', subtitle: 'Enter your email to receive a reset code' },
    otp: { title: 'Enter OTP', subtitle: `We sent a 6-digit code to ${email}` },
    reset: { title: 'New Password', subtitle: 'Choose a strong new password' },
  };

  const { title, subtitle } = stepTitles[step];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 }}
          >
            <Ionicons name="arrow-back" size={22} color={C.text} />
            <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 }}>
              {title}
            </Text>
            <Text style={{ fontSize: 15, color: C.textSecondary }}>{subtitle}</Text>
          </View>

          {/* Step indicators */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
            {['email', 'otp', 'reset'].map((s, i) => (
              <View
                key={s}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: ['email', 'otp', 'reset'].indexOf(step) >= i ? C.primary : C.border,
                }}
              />
            ))}
          </View>

          {error && (
            <View style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, color: '#DC2626' }}>{error}</Text>
            </View>
          )}

          {successMsg && (
            <View style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: '#ECFDF5',
              borderWidth: 1,
              borderColor: '#A7F3D0',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, color: '#065F46' }}>{successMsg}</Text>
            </View>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <View>
              <Input
                label="Email Address"
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                isDark={isDark}
                style={{ marginBottom: 24 }}
              />
              <Button onPress={handleSendOtp} loading={loading} size="lg" isDark={isDark}>
                Send OTP
              </Button>
            </View>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <View>
              <Input
                label="6-Digit OTP"
                icon="key-outline"
                placeholder="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                isDark={isDark}
                style={{ marginBottom: 24 }}
                inputStyle={{ textAlign: 'center', letterSpacing: 6, fontSize: 22, fontWeight: '700' }}
              />
              <Button onPress={handleVerifyOtp} loading={loading} size="lg" isDark={isDark} style={{ marginBottom: 12 }}>
                Verify OTP
              </Button>
              <Button onPress={handleSendOtp} variant="ghost" isDark={isDark}>
                Resend OTP
              </Button>
            </View>
          )}

          {/* Reset Step */}
          {step === 'reset' && (
            <View>
              <Input
                label="New Password"
                icon="lock-closed-outline"
                placeholder="Min 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                isDark={isDark}
                style={{ marginBottom: 14 }}
              />
              <Input
                label="Confirm Password"
                icon="lock-closed-outline"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                isDark={isDark}
                style={{ marginBottom: 24 }}
              />
              <Button onPress={handleResetPassword} loading={loading} size="lg" isDark={isDark}>
                Reset Password
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
