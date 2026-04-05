import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { invoiceAPI, clientAPI, projectAPI, paymentAccountAPI, organizationAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { getColors } from '../../utils/colors';
import { Input, Button, Card, ScreenHeader } from '../../components/ui';
import { formatINR } from '../../utils/format';

function LineItem({ item, index, onChange, onRemove, isDark }) {
  const C = getColors(isDark);
  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: C.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>Item {index + 1}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Ionicons name="close-circle" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder="Description *"
        value={item.description}
        onChangeText={(v) => onChange({ ...item, description: v })}
        placeholderTextColor={C.placeholder}
        style={{
          fontSize: 14, color: C.text, borderBottomWidth: 1, borderBottomColor: C.border,
          paddingVertical: 8, marginBottom: 10,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>Qty</Text>
          <TextInput
            placeholder="1"
            value={item.quantity}
            onChangeText={(v) => onChange({ ...item, quantity: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })}
            keyboardType="decimal-pad"
            placeholderTextColor={C.placeholder}
            style={{
              fontSize: 14, color: C.text, backgroundColor: C.inputBg,
              borderWidth: 1, borderColor: C.border, borderRadius: 8,
              padding: 8, textAlign: 'center',
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>Rate (₹)</Text>
          <TextInput
            placeholder="0"
            value={item.rate}
            onChangeText={(v) => onChange({ ...item, rate: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })}
            keyboardType="decimal-pad"
            placeholderTextColor={C.placeholder}
            style={{
              fontSize: 14, color: C.text, backgroundColor: C.inputBg,
              borderWidth: 1, borderColor: C.border, borderRadius: 8,
              padding: 8, textAlign: 'center',
            }}
          />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 }}>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4 }}>Amount</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{formatINR(amount)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CreateInvoiceScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const C = getColors(isDark);

  const [clients, setClients] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: '1', rate: '' }]);
  const [taxPercentage, setTaxPercentage] = useState('18');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    setDataLoading(true);
    const orgId = user?.organizationId;
    Promise.allSettled([
      clientAPI.getAll({ limit: 100 }).then(r => {
        const d = r.data?.data || r.data || [];
        setClients(Array.isArray(d) ? d : []);
      }),
      projectAPI.getAll({ limit: 100 }).then(r => {
        const d = r.data?.data || r.data || [];
        setAllProjects(Array.isArray(d) ? d : []);
      }),
      paymentAccountAPI.getAll().then(r => {
        const d = r.data?.data || r.data || [];
        setPaymentAccounts(Array.isArray(d) ? d : []);
      }),
      orgId
        ? organizationAPI.getById(orgId).then(r => {
            const org = r.data?.data || r.data;
            if (org?.taxPercentage !== undefined) setTaxPercentage(String(org.taxPercentage));
          })
        : Promise.resolve(),
    ]).finally(() => setDataLoading(false));
  }, []);

  // Filter projects when client changes
  useEffect(() => {
    if (!selectedClient) {
      setClientProjects([]);
      setSelectedProject('');
      return;
    }
    const filtered = allProjects.filter(p => {
      const clientId = p.clientId?._id || p.clientId;
      return clientId === selectedClient;
    });
    setClientProjects(filtered);
    setSelectedProject('');
  }, [selectedClient, allProjects]);

  const subtotal = items.reduce((sum, item) =>
    sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const taxAmount = subtotal * (parseFloat(taxPercentage) || 0) / 100;
  const total = subtotal + taxAmount;

  const updateItem = (idx, updated) => {
    setItems(prev => prev.map((item, i) => i === idx ? updated : item));
  };
  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };
  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: '1', rate: '' }]);
  };

  const handleCreate = async () => {
    if (!selectedClient) { Alert.alert('Error', 'Please select a client'); return; }
    const validItems = items.filter(item => item.description.trim() && parseFloat(item.rate) > 0);
    if (validItems.length === 0) { Alert.alert('Error', 'Add at least one item with description and rate'); return; }

    setLoading(true);
    const payload = {
      clientId: selectedClient,
      projectId: selectedProject || undefined,
      items: validItems.map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
      })),
      taxPercentage: parseFloat(taxPercentage) || 0,
      notes: notes.trim() || undefined,
      paymentAccountIds: paymentAccounts.map(a => a._id),
    };
    try {
      await invoiceAPI.create(payload);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create invoice');
    }
    setLoading(false);
  };

  const SectionLabel = ({ title }) => (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: C.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: 20, marginBottom: 10, paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );

  const ChipSelector = ({ items: chipItems, selected, onSelect, getLabel, getId, allowNone, noneLabel }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {allowNone && (
          <TouchableOpacity
            onPress={() => onSelect('')}
            style={{
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
              backgroundColor: !selected ? C.primary : C.surface,
              borderWidth: 1, borderColor: !selected ? C.primary : C.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: !selected ? '#FFF' : C.text }}>{noneLabel || 'None'}</Text>
          </TouchableOpacity>
        )}
        {chipItems.map((item) => (
          <TouchableOpacity
            key={getId(item)}
            onPress={() => onSelect(getId(item))}
            style={{
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
              backgroundColor: selected === getId(item) ? C.primary : C.surface,
              borderWidth: 1, borderColor: selected === getId(item) ? C.primary : C.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: selected === getId(item) ? '#FFF' : C.text }}>
              {getLabel(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="New Invoice" backButton onBack={() => navigation.goBack()} isDark={isDark} />

          {dataLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: 14 }}>Loading...</Text>
            </View>
          ) : (
            <>
              <SectionLabel title="Client *" />
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
                borderRadius: 10, paddingHorizontal: 12, marginBottom: 10,
              }}>
                <Ionicons name="search-outline" size={16} color={C.textTertiary} />
                <TextInput
                  placeholder="Search clients..."
                  placeholderTextColor={C.placeholder}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  style={{ flex: 1, fontSize: 14, color: C.text, paddingVertical: 10 }}
                />
                {clientSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setClientSearch('')}>
                    <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
              <ChipSelector
                items={clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()))}
                selected={selectedClient}
                onSelect={setSelectedClient}
                getLabel={c => c.name}
                getId={c => c._id}
              />

              {/* Show selected client info */}
              {selectedClient && (() => {
                const c = clients.find(cl => cl._id === selectedClient);
                return c ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                    borderRadius: 12, backgroundColor: C.primary + '15',
                    borderWidth: 1, borderColor: C.primary + '40', marginBottom: 4,
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: C.primary + '30', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>
                        {c.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{c.name}</Text>
                      {c.email && <Text style={{ fontSize: 12, color: C.textSecondary }}>{c.email}</Text>}
                    </View>
                  </View>
                ) : null;
              })()}

              {selectedClient && (
                <>
                  <SectionLabel title="Project (optional)" />
                  {clientProjects.length > 0 ? (
                    <ChipSelector
                      items={clientProjects}
                      selected={selectedProject}
                      onSelect={setSelectedProject}
                      getLabel={p => p.name}
                      getId={p => p._id}
                      allowNone
                      noneLabel="None"
                    />
                  ) : (
                    <Text style={{ fontSize: 13, color: C.textTertiary, marginBottom: 16, paddingHorizontal: 4 }}>
                      No projects for this client
                    </Text>
                  )}
                </>
              )}

              {/* Payment Accounts */}
              {paymentAccounts.length > 0 && (
                <>
                  <SectionLabel title="Payment Accounts" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                    {paymentAccounts.map(a => {
                      const typeLabel = a.type === 'upi' ? 'UPI' : a.type === 'qr' ? 'QR' : 'Bank';
                      const typeIcon = a.type === 'upi' ? 'phone-portrait-outline' : a.type === 'qr' ? 'qr-code-outline' : 'business-outline';
                      return (
                        <View key={a._id} style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '40',
                        }}>
                          <Ionicons name={typeIcon} size={14} color={C.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>{a.accountName || 'Account'}</Text>
                          <Text style={{ fontSize: 11, color: C.primary + 'AA' }}>({typeLabel})</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 4, paddingHorizontal: 4 }}>
                    All payment accounts will appear on the invoice
                  </Text>
                </>
              )}

              <SectionLabel title="Line Items" />
              {items.map((item, idx) => (
                <LineItem
                  key={idx}
                  item={item}
                  index={idx}
                  onChange={(updated) => updateItem(idx, updated)}
                  onRemove={() => removeItem(idx)}
                  isDark={isDark}
                />
              ))}
              <TouchableOpacity
                onPress={addItem}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingVertical: 12, borderRadius: 10,
                  borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="add" size={18} color={C.primary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>Add Item</Text>
              </TouchableOpacity>

              <SectionLabel title="Tax & Totals" />
              <Card isDark={isDark} style={{ marginBottom: 16 }}>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: C.textSecondary }}>Subtotal</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatINR(subtotal)}</Text>
                  </View>
                  {parseFloat(taxPercentage) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: C.textSecondary }}>Tax ({taxPercentage}%)</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{formatINR(taxAmount)}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>Total</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{formatINR(total)}</Text>
                  </View>
                </View>
              </Card>

              <SectionLabel title="Notes" />
              <Input
                placeholder="Payment terms, additional info..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                isDark={isDark}
                style={{ marginBottom: 24 }}
                inputStyle={{ height: 80, textAlignVertical: 'top' }}
              />

              <Button onPress={handleCreate} loading={loading} size="lg" isDark={isDark}>
                Create Invoice
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
