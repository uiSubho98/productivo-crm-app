import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { invoiceAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import {
  Card,
  Badge,
  SearchInput,
  EmptyState,
  Spinner,
  ScreenHeader,
  FilterChip,
} from '../../components/ui';
import { formatINR, formatDate } from '../../utils/format';

function InvoiceCard({ invoice, onPress, isDark }) {
  const C = getColors(isDark);
  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: isOverdue ? '#FECACA' : C.border,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          backgroundColor: isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#EFF6FF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons
            name="receipt-outline"
            size={22}
            color={isPaid ? '#059669' : isOverdue ? '#DC2626' : '#2563EB'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
              {invoice.invoiceNumber || `INV-${invoice._id?.slice(-6).toUpperCase()}`}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
              {formatINR(invoice.total)}
            </Text>
          </View>
          {invoice.clientId && (
            <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }} numberOfLines={1}>
              {invoice.clientId.name || invoice.clientId}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Badge status={invoice.status || 'draft'} />
            {invoice.paymentStatus && invoice.paymentStatus !== invoice.status && (
              <Badge status={invoice.paymentStatus} />
            )}
            {invoice.createdAt && (
              <Text style={{ fontSize: 12, color: C.textTertiary }}>
                {formatDate(invoice.createdAt)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InvoicesScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await invoiceAPI.getAll(params);
      const data = res.data?.data || res.data?.invoices || res.data || [];
      const invoiceList = Array.isArray(data) ? data : (data.invoices || []);
      setInvoices(invoiceList);

      // Sum payments[].amount for each invoice — same logic as web
      const collected = invoiceList.reduce((sum, inv) =>
        sum + (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0), 0);
      const outstanding = invoiceList.reduce((sum, inv) => {
        const paid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        return sum + Math.max(0, (inv.total || 0) - paid);
      }, 0);
      setSummary({ collected, outstanding, count: invoiceList.length });
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    return navigation.addListener('focus', () => fetchInvoices());
  }, [navigation, fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.clientId?.name || '').toLowerCase().includes(q)
    );
  });

  const STATUS_FILTERS = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScreenHeader title="Invoices" subtitle={`${invoices.length} invoices`} actionIcon="add" onAction={() => navigation.navigate('CreateInvoice')} isDark={isDark} />

          {/* Summary Cards */}
          {summary && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>Collected</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#065F46' }}>{formatINR(summary.collected)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 }}>
                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Outstanding</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#991B1B' }}>{formatINR(summary.outstanding)}</Text>
              </View>
            </View>
          )}

          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search invoices..."
            isDark={isDark}
            style={{ marginBottom: 12 }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUS_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={statusFilter === f.value}
                  onPress={() => setStatusFilter(f.value)}
                  isDark={isDark}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No invoices found" isDark={isDark} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoices(); }} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <InvoiceCard
                invoice={item}
                onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item._id })}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
