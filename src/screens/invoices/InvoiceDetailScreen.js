import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { invoiceAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, ScreenHeader, Button, AppModal, Input, DatePicker } from '../../components/ui';
import { formatINR, formatDate } from '../../utils/format';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function InvoiceDetailScreen({ route, navigation }) {
  const invoiceId = route?.params?.invoiceId || route?.params?.id;
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '', notes: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchInvoice = async () => {
    if (!invoiceId) { setLoading(false); return; }
    try {
      const res = await invoiceAPI.getById(invoiceId);
      setInvoice(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchInvoice(); }, [invoiceId]);

  const handleRecordPayment = async () => {
    const entered = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || entered <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    const alreadyPaid = (invoice?.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = (invoice?.total || 0) - alreadyPaid;
    if (entered > balanceDue + 0.001) {
      Alert.alert('Error', `Amount ₹${entered.toLocaleString('en-IN')} exceeds balance due ₹${balanceDue.toLocaleString('en-IN')}`);
      return;
    }
    setPaymentLoading(true);
    try {
      await invoiceAPI.addPayment(invoiceId, {
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '', notes: '' });
      fetchInvoice();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record payment');
    }
    setPaymentLoading(false);
  };

  const handleGeneratePdf = async () => {
    setPdfLoading(true);
    try {
      await invoiceAPI.generatePdf(invoiceId);
      Alert.alert('Success', 'PDF generated successfully');
      fetchInvoice();
    } catch {
      Alert.alert('Error', 'Failed to generate PDF');
    }
    setPdfLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="Invoice" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>Invoice not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoice(); }} tintColor={C.primary} />}
      >
        <ScreenHeader title="Invoice" backButton onBack={() => navigation.goBack()} isDark={isDark} />

        {/* Header Card */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 13, color: C.textTertiary, fontWeight: '500' }}>Invoice Number</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2 }}>
                {invoice.invoiceNumber}
              </Text>
            </View>
            <Badge status={invoice.status || 'draft'} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
            <View>
              <Text style={{ fontSize: 12, color: C.textTertiary }}>Client</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginTop: 2 }}>
                {invoice.clientId?.name || 'N/A'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: C.textTertiary }}>Date</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginTop: 2 }}>
                {formatDate(invoice.createdAt)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Amount Breakdown */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Amount</Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: C.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatINR(invoice.subtotal)}</Text>
            </View>
            {invoice.taxPercentage > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: C.textSecondary }}>Tax ({invoice.taxPercentage}%)</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatINR(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>Total</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: isPaid ? '#059669' : isOverdue ? '#DC2626' : C.primary }}>
                {formatINR(invoice.total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Line Items */}
        {invoice.items?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Line Items</Text>
            <View style={{ gap: 10 }}>
              {invoice.items.map((item, idx) => (
                <View key={idx} style={{
                  padding: 12,
                  backgroundColor: C.surface,
                  borderRadius: 10,
                  gap: 4,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{item.description}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: C.textSecondary }}>
                      {item.quantity} × {formatINR(item.rate)}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
                      {formatINR(item.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Payments */}
        {invoice.payments?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
              Payments ({invoice.payments.length})
            </Text>
            <View style={{ gap: 10 }}>
              {invoice.payments.map((payment, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  backgroundColor: '#ECFDF5',
                  borderRadius: 10,
                }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669' }}>
                      {formatINR(payment.amount)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#065F46', textTransform: 'capitalize' }}>
                      {payment.method?.replace('_', ' ')} · {formatDate(payment.date)}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color="#059669" />
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 }}>Notes</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{invoice.notes}</Text>
          </Card>
        )}

        {/* Actions */}
        <View style={{ gap: 10 }}>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              onPress={() => setShowPaymentModal(true)}
              isDark={isDark}
              icon="card-outline"
            >
              Record Payment
            </Button>
          )}
          <Button
            onPress={handleGeneratePdf}
            loading={pdfLoading}
            variant="outline"
            isDark={isDark}
            icon="document-outline"
          >
            Generate PDF
          </Button>
        </View>
      </ScrollView>

      <AppModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" isDark={isDark} size="sm">
        <Input
          label="Amount (₹) *"
          icon="cash-outline"
          placeholder="0.00"
          value={paymentForm.amount}
          onChangeText={(v) => setPaymentForm(p => ({ ...p, amount: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') }))}
          keyboardType="decimal-pad"
          isDark={isDark}
          style={{ marginBottom: 12 }}
        />
        <DatePicker
          label="Date"
          value={paymentForm.date}
          onChange={(v) => setPaymentForm(p => ({ ...p, date: v }))}
          isDark={isDark}
          style={{ marginBottom: 12 }}
        />
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: getColors(isDark).textSecondary, marginBottom: 8 }}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PAYMENT_METHODS.map((m) => {
                const C = getColors(isDark);
                const active = paymentForm.method === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setPaymentForm(p => ({ ...p, method: m.value }))}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: active ? C.primary : C.surface,
                      borderWidth: 1, borderColor: active ? C.primary : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFF' : C.text }}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
        <Input
          label="Reference"
          placeholder="Transaction ID, cheque no..."
          value={paymentForm.reference}
          onChangeText={(v) => setPaymentForm(p => ({ ...p, reference: v }))}
          isDark={isDark}
          style={{ marginBottom: 12 }}
        />
        <Input
          label="Notes"
          placeholder="Optional notes..."
          value={paymentForm.notes}
          onChangeText={(v) => setPaymentForm(p => ({ ...p, notes: v }))}
          isDark={isDark}
          style={{ marginBottom: 16 }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" onPress={() => setShowPaymentModal(false)} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={handleRecordPayment} loading={paymentLoading} isDark={isDark} style={{ flex: 1 }}>Record</Button>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
