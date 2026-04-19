import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { superAdminAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Spinner, ScreenHeader, FilterChip, StatCard, EmptyState } from '../../components/ui';

const STATUS_FILTERS = [
  { value: '',        label: 'All' },
  { value: 'paid',    label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed',  label: 'Failed' },
];

function StatusPill({ status, C }) {
  const color = status === 'paid' ? C.success
    : status === 'failed' ? C.danger
    : C.warning;
  const bg = status === 'paid' ? C.successLight
    : status === 'failed' ? C.dangerLight
    : C.warningLight;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: bg, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'capitalize' }}>{status || '—'}</Text>
    </View>
  );
}

export default function SuperAdminPaymentsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await superAdminAPI.getPayments(params);
      setPayments(res.data?.data || null);
      setPage(p);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load payments');
      setPayments(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(1); }, [statusFilter]);

  const purchases = payments?.purchases || [];
  const summary = payments?.summary || {};
  const pagination = payments?.pagination || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Payments"
          subtitle="Platform-wide purchase history"
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
        />

        {/* Summary */}
        {summary && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <View style={{ width: '48%' }}>
              <StatCard icon="cash-outline" label="Total" value={(summary.totalRevenue ?? 0).toLocaleString('en-IN')} color="green" isDark={isDark} />
            </View>
            <View style={{ width: '48%' }}>
              <StatCard icon="pie-chart-outline" label="Paid" value={summary.paid ?? 0} color="green" isDark={isDark} />
            </View>
            <View style={{ width: '48%' }}>
              <StatCard icon="hourglass-outline" label="Pending" value={summary.pending ?? 0} color="yellow" isDark={isDark} />
            </View>
            <View style={{ width: '48%' }}>
              <StatCard icon="close-circle-outline" label="Failed" value={summary.failed ?? 0} color="red" isDark={isDark} />
            </View>
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
          {STATUS_FILTERS.map((s) => (
            <FilterChip
              key={s.value}
              label={s.label}
              active={statusFilter === s.value}
              onPress={() => setStatusFilter(s.value)}
              isDark={isDark}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}><Spinner /></View>
        ) : purchases.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No payments" subtitle="No records match this filter." isDark={isDark} />
        ) : (
          <>
            {purchases.map((p) => (
              <Card key={p._id} isDark={isDark} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>{p.name || 'Unknown'}</Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{p.email}</Text>
                    {p.phone ? <Text style={{ fontSize: 12, color: C.textTertiary }}>{p.phone}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
                      ₹{(p.amount || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
                      {p.plan || 'Pro'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <StatusPill status={p.status} C={C} />
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
              </Card>
            ))}

            {pagination.pages > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: C.textTertiary }}>
                  Page {page} of {pagination.pages}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => load(page - 1)}
                    disabled={page <= 1}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      borderWidth: 1, borderColor: C.border, opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => load(page + 1)}
                    disabled={page >= pagination.pages}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      borderWidth: 1, borderColor: C.border, opacity: page >= pagination.pages ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
