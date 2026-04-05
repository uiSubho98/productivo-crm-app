import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { organizationAPI } from '../../services/api';
import { Input, Button } from '../../components/ui';

export default function SetupOrgScreen({ navigation }) {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { initialize } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await organizationAPI.create({ name: orgName.trim() });
      // Re-fetch user profile so organizationId is populated
      await initialize();
      // Navigator will react to updated user state and show MainTabs
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create organization';
      Alert.alert('Error', msg);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 22,
              backgroundColor: C.primary,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
            }}>
              <Ionicons name="business" size={34} color="#FFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, textAlign: 'center' }}>
              Set up your workspace
            </Text>
            <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Create your master organization.{'\n'}You can add details and team members later.
            </Text>
          </View>

          {/* Free plan badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF',
            borderRadius: 12, padding: 14, marginBottom: 24,
            borderWidth: 1, borderColor: isDark ? '#3730a3' : '#C7D2FE',
          }}>
            <Ionicons name="sparkles" size={18} color="#6366F1" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366F1' }}>Free Starter Plan</Text>
              <Text style={{ fontSize: 12, color: isDark ? '#a5b4fc' : '#4F46E5', marginTop: 1 }}>
                3 clients · 5 projects · 3 invoices · 10 members — all lifetime
              </Text>
            </View>
          </View>

          {error ? (
            <View style={{
              padding: 14, borderRadius: 12, marginBottom: 16,
              backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
            }}>
              <Text style={{ fontSize: 14, color: '#DC2626' }}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Organization Name"
            icon="business-outline"
            placeholder="Acme Corp"
            value={orgName}
            onChangeText={(v) => { setOrgName(v); setError(''); }}
            isDark={isDark}
            style={{ marginBottom: 20 }}
            autoFocus
          />

          <Button onPress={handleCreate} loading={loading} size="lg" isDark={isDark}>
            Create & Get Started
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
