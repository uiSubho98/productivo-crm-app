import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { superAdminAPI } from '../../services/api';
import { getColors } from '../../utils/colors';
import { Card, SectionHeader, Spinner } from '../../components/ui';
import { getGreeting } from '../../utils/format';

function StatCard({ icon, label, value, bg, iconColor, textColor, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flex: 1, backgroundColor: bg, borderRadius: 14, padding: 14 }}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: textColor || iconColor, marginTop: 8 }}>
        {value ?? '—'}
      </Text>
      <Text style={{ fontSize: 11, color: iconColor, fontWeight: '500', marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProductOwnerDashboardScreen({ navigation }) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [ovRes, usersRes] = await Promise.allSettled([
        superAdminAPI.getOverview(),
        superAdminAPI.getUsers({ limit: 5 }),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data?.data || null);
      if (usersRes.status === 'fulfilled') {
        const d = usersRes.value.data?.data;
        setAccounts(d?.users || (Array.isArray(d) ? d : []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const db = overview?.db;

  const planBadgeColor = (plan) => plan === 'pro' ? { bg: '#ECFDF5', text: '#059669' } : { bg: '#F1F5F9', text: '#64748B' };
  const planLabel = (plan) => plan === 'pro' ? 'Pro' : 'Free';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Greeting */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '500' }}>
            {format(new Date(), 'EEEE, MMMM d')} · Product Owner
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.5 }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Spinner size="lg" color={C.primary} />
          </View>
        ) : (
          <>
            {/* Platform Overview */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Platform Overview" isDark={isDark} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <StatCard
                  icon="shield-checkmark-outline"
                  label="Superadmins"
                  value={overview?.superadminBreakdown?.length ?? db?.users ?? 0}
                  bg={C.primaryLight}
                  iconColor={C.primary}
                  onPress={() => navigation.navigate('More', { screen: 'Users' })}
                />
                <StatCard
                  icon="business-outline"
                  label="Organisations"
                  value={db?.organizations ?? 0}
                  bg="#EDE9FE"
                  iconColor="#7C3AED"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <StatCard
                  icon="folder-outline"
                  label="Projects"
                  value={db?.projects ?? 0}
                  bg="#EFF6FF"
                  iconColor="#2563EB"
                />
                <StatCard
                  icon="receipt-outline"
                  label="Invoices"
                  value={db?.invoices ?? 0}
                  bg="#ECFDF5"
                  iconColor="#059669"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatCard
                  icon="list-outline"
                  label="Tasks"
                  value={db?.tasks ?? 0}
                  bg="#FFFBEB"
                  iconColor="#D97706"
                />
                <StatCard
                  icon="people-outline"
                  label="Total Users"
                  value={db?.users ?? 0}
                  bg="#FEF2F2"
                  iconColor="#DC2626"
                />
              </View>
            </View>

            {/* System Health */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="System Health" isDark={isDark} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <StatCard
                  icon="mail-outline"
                  label="Emails Today"
                  value={overview?.email?.today ?? 0}
                  bg={C.primaryLight}
                  iconColor={C.primary}
                />
                <StatCard
                  icon="chatbubble-outline"
                  label="WhatsApp Today"
                  value={overview?.whatsapp?.today ?? 0}
                  bg="#ECFDF5"
                  iconColor="#059669"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatCard
                  icon="pulse-outline"
                  label="API Calls Today"
                  value={overview?.api?.today ?? 0}
                  bg="#EDE9FE"
                  iconColor="#7C3AED"
                />
                <StatCard
                  icon="help-circle-outline"
                  label="New Enquiries"
                  value={overview?.enquiries?.new ?? 0}
                  bg="#FFFBEB"
                  iconColor="#D97706"
                />
              </View>
            </View>

            {/* Quick Links */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Management" isDark={isDark} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Accounts', icon: 'shield-checkmark-outline', color: C.primary, screen: 'Users' },
                  { label: 'Leads', icon: 'mail-unread-outline', color: '#7C3AED', screen: 'Enquiries' },
                  { label: 'Settings', icon: 'settings-outline', color: '#64748B', screen: 'Settings' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => navigation.navigate('More', { screen: item.screen })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: C.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: C.border,
                      minWidth: '45%',
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Superadmin Accounts */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader
                title="Recent Accounts"
                isDark={isDark}
                actionLabel="View all"
                onAction={() => navigation.navigate('More', { screen: 'Users' })}
              />
              <Card isDark={isDark} padding={false}>
                {accounts.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={28} color={C.textTertiary} />
                    <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 8 }}>No accounts found</Text>
                  </View>
                ) : (
                  accounts.slice(0, 5).map((acc, idx) => {
                    const badge = planBadgeColor(acc.subscription?.plan || acc.plan);
                    return (
                      <View
                        key={acc._id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          padding: 14,
                          borderBottomWidth: idx < accounts.length - 1 ? 1 : 0,
                          borderBottomColor: C.borderLight,
                        }}
                      >
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: C.primaryLight,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>
                            {acc.name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>{acc.name}</Text>
                          <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{acc.email}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: badge.text }}>{planLabel(acc.subscription?.plan || acc.plan)}</Text>
                          </View>
                          {acc.isActive === false && (
                            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Blocked</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </Card>
            </View>

            {/* DB Collections */}
            {(overview?.db?.collections || []).length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title="Database Collections" isDark={isDark} />
                <Card isDark={isDark} padding={false}>
                  {(overview.db.collections || []).slice(0, 6).map((col, idx) => (
                    <View
                      key={col.name}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        paddingHorizontal: 14,
                        borderBottomWidth: idx < 5 ? 1 : 0,
                        borderBottomColor: C.borderLight,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, textTransform: 'capitalize' }}>{col.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Text style={{ fontSize: 12, color: C.textSecondary }}>{col.count?.toLocaleString()} docs</Text>
                        <Text style={{ fontSize: 12, color: C.textTertiary }}>{col.sizeKB} KB</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
