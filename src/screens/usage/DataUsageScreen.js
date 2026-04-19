import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usageAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Spinner, ScreenHeader, EmptyState, StatCard, FilterChip, AppModal } from '../../components/ui';

const DB_METRICS = [
  { key: 'users',    label: 'Members',  icon: 'people-outline',     color: 'blue'    },
  { key: 'clients',  label: 'Clients',  icon: 'briefcase-outline',  color: 'purple'  },
  { key: 'projects', label: 'Projects', icon: 'folder-outline',     color: 'yellow'  },
  { key: 'tasks',    label: 'Tasks',    icon: 'checkbox-outline',   color: 'green'   },
  { key: 'invoices', label: 'Invoices', icon: 'receipt-outline',    color: 'indigo'  },
  { key: 'meetings', label: 'Meetings', icon: 'videocam-outline',   color: 'red'     },
];

const ACTIVITY_TABS = [
  { value: '',         label: 'All' },
  { value: 'api',      label: 'API' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email',    label: 'Email' },
];

function ActivityRow({ log, C }) {
  const typeMeta = {
    api:      { icon: 'pulse-outline',      color: '#3B82F6' },
    email:    { icon: 'mail-outline',       color: '#F59E0B' },
    whatsapp: { icon: 'logo-whatsapp',      color: '#10B981' },
  };
  const m = typeMeta[log.type] || typeMeta.api;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={m.icon} size={14} color={m.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 13, color: C.text, flex: 1 }} numberOfLines={2}>
            {log.type === 'api'
              ? `${log.method} ${log.path}  ${log.statusCode || ''}`
              : (log.subject || `${log.type} → ${log.to || '—'}`)}
          </Text>
          <Text style={{ fontSize: 11, color: C.textTertiary }}>
            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }} numberOfLines={1}>
          {log.userEmail || 'system'}
          {log.type !== 'api' && log.to ? ` · to ${log.to}` : ''}
          {log.durationMs ? ` · ${log.durationMs}ms` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function DataUsageScreen({ navigation }) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const isPO = user?.role === 'product_owner';

  const [superadmins, setSuperadmins] = useState([]);
  const [selectedSA, setSelectedSA] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    if (isPO) {
      usageAPI.listSuperadmins().then((r) => setSuperadmins(r.data?.data || [])).catch(() => {});
    }
  }, [isPO]);

  const load = async () => {
    setLoading(true);
    try {
      const params = isPO && selectedSA ? { superadminId: selectedSA } : {};
      const res = await usageAPI.getOverview(params);
      setOverview(res.data?.data || null);
    } catch {
      setOverview(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [selectedSA, isPO]);

  const recent = overview?.recent || [];
  const filtered = activityFilter ? recent.filter((l) => l.type === activityFilter) : recent;

  const scopeLabel = (() => {
    if (!overview?.target) return 'Your organization';
    const { kind, name } = overview.target;
    if (kind === 'platform') return 'Entire platform';
    if (kind === 'superadmin') return name ? `${name}'s orgs` : 'Superadmin';
    if (kind === 'org') return name || 'Organization';
    return 'Your organization';
  })();

  const selectedSALabel = (() => {
    if (!selectedSA) return 'Entire platform';
    const s = superadmins.find((x) => x._id === selectedSA);
    return s ? `${s.name} — ${s.email}` : 'Selected';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Data & Activity"
          subtitle={loading ? 'Loading…' : scopeLabel}
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
        />

        {isPO && (
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
            }}
          >
            <Ionicons name="funnel-outline" size={16} color={C.textSecondary} />
            <Text style={{ flex: 1, fontSize: 13, color: C.text }} numberOfLines={1}>
              Scope: {selectedSALabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.textTertiary} />
          </TouchableOpacity>
        )}

        {loading && !overview ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}><Spinner /></View>
        ) : !overview ? (
          <EmptyState icon="server-outline" title="No data" subtitle="Couldn't load usage stats." isDark={isDark} />
        ) : (
          <>
            {/* DB stats */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Database records
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {DB_METRICS.map((m) => (
                <View key={m.key} style={{ width: '31%' }}>
                  <StatCard
                    icon={m.icon}
                    label={m.label}
                    value={(overview.db?.[m.key] ?? 0).toLocaleString('en-IN')}
                    color={m.color}
                    isDark={isDark}
                  />
                </View>
              ))}
            </View>

            {/* Activity this month */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Activity this month
            </Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              <Card isDark={isDark}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="pulse-outline" size={14} color="#3B82F6" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>API Requests</Text>
                  </View>
                  {!!overview.activity?.api?.errorsThisMonth && (
                    <Text style={{ fontSize: 11, color: C.danger, fontWeight: '700' }}>{overview.activity.api.errorsThisMonth} errors</Text>
                  )}
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>
                  {(overview.activity?.api?.thisMonth ?? 0).toLocaleString('en-IN')}
                </Text>
              </Card>
              <Card isDark={isDark}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>WhatsApp</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>
                  {(overview.activity?.whatsapp?.thisMonth ?? 0).toLocaleString('en-IN')}
                </Text>
              </Card>
              <Card isDark={isDark}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="mail-outline" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>Email</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>
                  {(overview.activity?.email?.thisMonth ?? 0).toLocaleString('en-IN')}
                </Text>
              </Card>
            </View>

            {/* Recent activity */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Recent activity
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {ACTIVITY_TABS.map((t) => (
                <FilterChip
                  key={t.value}
                  label={t.label}
                  active={activityFilter === t.value}
                  onPress={() => setActivityFilter(t.value)}
                  isDark={isDark}
                />
              ))}
            </View>
            <Card isDark={isDark}>
              {filtered.length === 0 ? (
                <Text style={{ fontSize: 13, color: C.textSecondary, paddingVertical: 16, textAlign: 'center' }}>No activity yet.</Text>
              ) : (
                filtered.slice(0, 30).map((log) => <ActivityRow key={log._id} log={log} C={C} />)
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <AppModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Scope" isDark={isDark} size="sm">
        <ScrollView style={{ maxHeight: 400 }}>
          <TouchableOpacity
            onPress={() => { setSelectedSA(''); setPickerOpen(false); }}
            style={{
              padding: 12, borderRadius: 10, marginBottom: 6,
              backgroundColor: !selectedSA ? C.primaryLight : 'transparent',
              borderWidth: 1, borderColor: !selectedSA ? C.primary + '40' : C.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Entire platform</Text>
          </TouchableOpacity>
          {superadmins.map((s) => (
            <TouchableOpacity
              key={s._id}
              onPress={() => { setSelectedSA(s._id); setPickerOpen(false); }}
              style={{
                padding: 12, borderRadius: 10, marginBottom: 6,
                backgroundColor: selectedSA === s._id ? C.primaryLight : 'transparent',
                borderWidth: 1, borderColor: selectedSA === s._id ? C.primary + '40' : C.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{s.name}</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>{s.email}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppModal>
    </SafeAreaView>
  );
}
