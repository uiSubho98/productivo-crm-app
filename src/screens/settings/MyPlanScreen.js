import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { getColors } from '../../utils/colors';
import { Card, Input, Button, AppModal, ScreenHeader } from '../../components/ui';
import api from '../../services/api';

const FREE_FEATURES = [
  { label: '3 clients (lifetime)',                  included: true },
  { label: '5 projects (lifetime)',                 included: true },
  { label: '3 invoices (lifetime)',                 included: true },
  { label: 'Unlimited tasks',                       included: true },
  { label: '10 team members (lifetime, incl. you)', included: true },
  { label: 'View & manage users',                   included: true },
  { label: 'Meetings & calendar',                   included: false },
  { label: 'WhatsApp CRM',                          included: false },
  { label: 'Sub-organisations',                     included: false },
  { label: 'Activity logs',                         included: false },
  { label: 'Mobile app access',                     included: false },
  { label: 'Priority support',                      included: false },
];

const PRO_FEATURES = [
  { label: 'Unlimited clients',       included: true },
  { label: 'Unlimited projects',      included: true },
  { label: 'Unlimited invoices',      included: true },
  { label: 'Unlimited tasks',         included: true },
  { label: 'Unlimited team members',  included: true },
  { label: 'Meetings & calendar',     included: true },
  { label: 'WhatsApp CRM',            included: true },
  { label: 'Sub-organisations',       included: true },
  { label: 'Activity logs',           included: true },
  { label: 'Mobile app access',       included: true },
  { label: 'Priority support',        included: true },
];

function UsageRow({ label, current, limit, C }) {
  const isUnlimited = limit === null || limit === undefined || !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isFull = pct >= 100;
  const isWarn = pct >= 80;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 13, color: C.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: isFull ? '#EF4444' : isWarn ? '#F59E0B' : C.textTertiary }}>
          {isUnlimited ? `${current}` : `${current} / ${limit}`}
        </Text>
      </View>
      {!isUnlimited && (
        <View style={{ height: 5, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }}>
          <View style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: isFull ? '#EF4444' : isWarn ? '#F59E0B' : C.primary,
          }} />
        </View>
      )}
    </View>
  );
}

export default function MyPlanScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const C = getColors(isDark);

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });

  useEffect(() => {
    fetchSub();
  }, []);

  const fetchSub = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscription');
      setSub(res.data?.data || res.data);
    } catch {
      setSub(null);
    }
    setLoading(false);
  };

  const handleUpgrade = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setUpgrading(true);
    try {
      const res = await api.post('/subscription/upgrade', form);
      const { paymentUrl } = res.data;
      if (paymentUrl) {
        setUpgradeModal(false);
        const supported = await Linking.canOpenURL(paymentUrl);
        if (supported) {
          await Linking.openURL(paymentUrl);
        } else {
          Alert.alert('Error', 'Could not open payment page.');
        }
      } else {
        Alert.alert('Error', 'Could not get payment link. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to initiate upgrade. Try again.');
    }
    setUpgrading(false);
  };

  const isFree = !sub || sub.plan === 'free';
  const isPro = sub?.plan === 'pro' || sub?.plan === 'enterprise';

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="My Plan" backButton onBack={() => navigation.goBack()} isDark={isDark} />

        {/* Plan badge */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: isFree ? C.surface : '#EDE9FE',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons
                name={isFree ? 'flash-outline' : 'ribbon-outline'}
                size={24}
                color={isFree ? C.textTertiary : '#7C3AED'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>
                {isFree ? 'Starter Plan' : 'Pro Plan'}
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                {isFree
                  ? 'Free forever'
                  : `Active · Expires ${sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`}
              </Text>
            </View>
            {isFree && (
              <TouchableOpacity
                onPress={() => setUpgradeModal(true)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: '#7C3AED',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Upgrade</Text>
              </TouchableOpacity>
            )}
            {isPro && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EDE9FE' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED' }}>Active</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Usage */}
        {sub?.usage && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Current Usage</Text>
            <UsageRow label="Team members" current={sub.usage.users} limit={isFree ? sub.limits?.users : Infinity} C={C} />
            <UsageRow label="Clients" current={sub.usage.clients} limit={isFree ? sub.limits?.clients : Infinity} C={C} />
            <UsageRow label="Active projects" current={sub.usage.projects} limit={isFree ? sub.limits?.projects : Infinity} C={C} />
            <UsageRow label="Invoices (total)" current={sub.usage.invoices} limit={isFree ? sub.limits?.invoices : Infinity} C={C} />
          </Card>
        )}

        {/* Features */}
        <Card isDark={isDark} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>
            {isFree ? 'Free Plan — Full Feature List' : 'Pro Plan — Full Feature List'}
          </Text>
          {(isFree ? FREE_FEATURES : PRO_FEATURES).map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: f.included ? '#D1FAE5' : '#FEE2E2',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons
                  name={f.included ? 'checkmark' : 'close'}
                  size={12}
                  color={f.included ? '#059669' : '#DC2626'}
                />
              </View>
              <Text style={{ fontSize: 14, color: f.included ? C.text : C.textTertiary }}>{f.label}</Text>
            </View>
          ))}
        </Card>

        {/* Upgrade CTA for free users */}
        {isFree && (
          <TouchableOpacity
            onPress={() => setUpgradeModal(true)}
            style={{
              padding: 18, borderRadius: 18,
              backgroundColor: '#7C3AED',
              alignItems: 'center',
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Pro Plan
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFF' }}>₹1499 / year</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
              Everything unlocked. No seat fees.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Upgrade Modal */}
      <AppModal isOpen={upgradeModal} onClose={() => setUpgradeModal(false)} title="Upgrade to Pro" isDark={isDark}>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
          You'll be redirected to our secure payment page. Your plan activates instantly after payment.
        </Text>

        <Input
          label="Full Name"
          placeholder="Your name"
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          isDark={isDark}
          style={{ marginBottom: 12 }}
        />
        <Input
          label="Email"
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          isDark={isDark}
          style={{ marginBottom: 12 }}
        />
        <Input
          label="Phone / WhatsApp"
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
          isDark={isDark}
          style={{ marginBottom: 20 }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" onPress={() => setUpgradeModal(false)} isDark={isDark} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            onPress={handleUpgrade}
            loading={upgrading}
            isDark={isDark}
            style={{ flex: 1, backgroundColor: '#7C3AED' }}
          >
            Pay ₹1499
          </Button>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
