import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useWhatsappAddonStore from '../../store/whatsappAddonStore';
import { getColors } from '../../utils/colors';
import { whatsappAddonAPI } from '../../services/api';
import { ScreenHeader, Button, AppModal, Spinner } from '../../components/ui';

const FEATURES = [
  {
    id: 'invoice',
    icon: 'receipt-outline',
    title: 'Send Invoice via WhatsApp',
    description: "Deliver invoices to your client's WhatsApp the moment they're created.",
    bullets: [
      'One-tap send from Invoice screen',
      'Uses your approved invoice template',
      'Delivery confirmation tracked',
    ],
  },
  {
    id: 'task_reminder',
    icon: 'notifications-outline',
    title: 'Task Reminders via WhatsApp',
    description: 'Send WhatsApp reminders to assignees when a task is due or overdue.',
    bullets: [
      'Remind any assignee from Task Detail',
      'Includes project, due date, priority',
      'Works from any device',
    ],
  },
  {
    id: 'meeting_invite',
    icon: 'calendar-outline',
    title: 'Meeting Invites via WhatsApp',
    description: "Push meeting details and join links directly to every attendee's WhatsApp.",
    bullets: [
      'All attendees with a WA number notified',
      'Includes Meet link and agenda',
      'No email-only invites needed',
    ],
  },
];

function formatExpiry(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return null; }
}

function StatusPill({ isActive, expiresAt, C }) {
  if (isActive) {
    const exp = formatExpiry(expiresAt);
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
        backgroundColor: C.successLight, borderWidth: 1, borderColor: C.success + '40',
        alignSelf: 'flex-start',
      }}>
        <Ionicons name="checkmark-circle" size={12} color={C.success} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.success }} numberOfLines={1}>
          Active{exp ? ` · until ${exp}` : ''}
        </Text>
      </View>
    );
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      alignSelf: 'flex-start',
    }}>
      <Ionicons name="lock-closed" size={11} color={C.textSecondary} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSecondary }}>Locked</Text>
    </View>
  );
}

export default function PremiumFeaturesScreen({ navigation }) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const { features, prices, isFetched, isLoading, fetch: fetchAddons } = useWhatsappAddonStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [selection, setSelection] = useState(null); // 'invoice' | 'task_reminder' | 'meeting_invite' | 'bundle'
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);

  const canPurchase = user?.role === 'superadmin';

  useEffect(() => { fetchAddons(); }, []);

  useEffect(() => {
    whatsappAddonAPI.getLogs({ limit: 10 })
      .then((r) => setLogs(r.data?.data || []))
      .catch(() => {});
  }, []);

  // Refetch when screen regains focus (user returning from payment browser)
  useFocusEffect(useCallback(() => { fetchAddons(); }, []));

  // Refetch when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchAddons();
    });
    return () => sub.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAddons();
    setRefreshing(false);
  };

  const openCheckout = (sel) => {
    if (!canPurchase) {
      Alert.alert('Not allowed', 'Only your superadmin can purchase add-ons.');
      return;
    }
    if (!user?.phoneNumber) {
      Alert.alert(
        'Phone number required',
        'Set your phone number in Settings before purchasing.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
        ]
      );
      return;
    }
    setSelection(sel);
    setModalOpen(true);
  };

  const handlePay = async () => {
    setSubmitting(true);
    try {
      const featuresToBuy = selection === 'bundle'
        ? ['invoice', 'task_reminder', 'meeting_invite']
        : [selection];
      const res = await whatsappAddonAPI.initiatePurchase({ features: featuresToBuy });
      const url = res.data?.paymentUrl || res.data?.data?.paymentUrl;
      if (!url) {
        Alert.alert('Error', 'Payment URL not received. Please try again.');
        return;
      }
      setModalOpen(false);
      // Open Cashfree hosted checkout in an in-app browser. When it closes,
      // the useFocusEffect above refetches addon status to reflect purchase.
      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      // After close, give the server a moment then refetch.
      setTimeout(() => fetchAddons(), 500);
    } catch (err) {
      Alert.alert('Payment failed', err.response?.data?.error || err.response?.data?.message || 'Failed to start payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectionLabel = selection === 'bundle'
    ? 'All 3 Add-ons Bundle'
    : FEATURES.find((f) => f.id === selection)?.title || '';
  const selectionPrice = selection === 'bundle' ? prices.bundle : (prices[selection] || prices.invoice);

  const allUnlocked = features.invoice.isActive && features.task_reminder.isActive && features.meeting_invite.isActive;

  if (!isFetched && isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Add-ons"
          subtitle="Unlock WhatsApp automation"
          isDark={isDark}
          backButton
          onBack={() => navigation.goBack()}
        />

        {/* Bundle card */}
        {!allUnlocked && (
          <View style={{
            borderRadius: 20, padding: 20, marginBottom: 20,
            backgroundColor: C.primary,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="flash" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Bundle · Save ₹{(prices.invoice * 3) - prices.bundle}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 6 }}>
              All 3 Add-ons — 1 year
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
              Invoice + Task Reminder + Meeting Invite — unlock everything.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFF' }}>₹{prices.bundle.toLocaleString('en-IN')}</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'line-through' }}>
                ₹{(prices.invoice * 3).toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openCheckout('bundle')}
              disabled={!canPurchase}
              style={{
                backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: canPurchase ? 1 : 0.7,
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color={C.primary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>Unlock All — ₹{prices.bundle.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feature cards */}
        {FEATURES.map((feature) => {
          const status = features[feature.id] || { isActive: false };
          const price = prices[feature.id] || 499;
          return (
            <View key={feature.id} style={{
              backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14,
              borderWidth: 1, borderColor: C.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                <StatusPill isActive={status.isActive} expiresAt={status.expiresAt} C={C} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={feature.icon} size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 }}>
                    {feature.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
                    {feature.description}
                  </Text>
                </View>
              </View>

              {feature.bullets.map((b) => (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Ionicons name="checkmark-circle" size={15} color={status.isActive ? C.success : C.primary} />
                  <Text style={{ fontSize: 13, color: C.textSecondary, flex: 1 }}>{b}</Text>
                </View>
              ))}

              <View style={{
                marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <View>
                  <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Price / year</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                    ₹{price.toLocaleString('en-IN')}
                  </Text>
                </View>
                {status.isActive ? (
                  <TouchableOpacity
                    onPress={() => openCheckout(feature.id)}
                    disabled={!canPurchase}
                    style={{
                      borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
                      borderWidth: 1.5, borderColor: C.border,
                      opacity: canPurchase ? 1 : 0.7,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Renew</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => openCheckout(feature.id)}
                    disabled={!canPurchase}
                    style={{
                      backgroundColor: C.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      opacity: canPurchase ? 1 : 0.7,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="flash" size={14} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Unlock</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Recent activity */}
        {logs.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Recent Sends
            </Text>
            {logs.slice(0, 5).map((log) => (
              <View key={log._id} style={{
                backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8,
                borderWidth: 1, borderColor: C.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <Ionicons
                  name={log.kind === 'invoice' ? 'receipt-outline' : log.kind === 'task_reminder' ? 'notifications-outline' : 'calendar-outline'}
                  size={18} color={C.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>
                    {log.kind?.replace(/_/g, ' ')} → {log.toPhone || log.recipient || 'WhatsApp'}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : ''}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: log.status === 'sent' || log.status === 'delivered' ? C.successLight : C.dangerLight,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: log.status === 'sent' || log.status === 'delivered' ? C.success : C.danger, textTransform: 'uppercase' }}>
                    {log.status || 'sent'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Purchase" isDark={isDark}>
        <View style={{ gap: 14 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: C.primaryLight, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: C.primary + '30',
          }}>
            <Ionicons name="flash" size={22} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{selectionLabel}</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>1 year, auto-renew off</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
              ₹{(selectionPrice || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 18 }}>
            You'll be redirected to our secure payment page (Cashfree). The add-on activates automatically once payment is confirmed.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="outline" onPress={() => setModalOpen(false)} isDark={isDark} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button onPress={handlePay} loading={submitting} isDark={isDark} icon="card-outline" style={{ flex: 1 }}>
              Pay ₹{(selectionPrice || 0).toLocaleString('en-IN')}
            </Button>
          </View>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
