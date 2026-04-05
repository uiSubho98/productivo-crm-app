import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Input, Button, ScreenHeader, PhoneInput } from '../../components/ui';
import AddressSearch from '../../components/AddressSearch';

const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'quotation_revised', label: 'Quotation Revised' },
  { value: 'mvp_shared', label: 'MVP Shared' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'inactive', label: 'Inactive' },
];

const SOURCES = [
  { value: '', label: 'None' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'other', label: 'Other' },
];

export default function CreateClientScreen({ route, navigation }) {
  const editClient = route?.params?.client;
  const isEdit = !!editClient;
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [form, setForm] = useState({
    name: editClient?.name || '',
    companyName: editClient?.companyName || '',
    email: editClient?.email || '',
    phoneNumber: (editClient?.phoneNumber || '').replace(/^\+91/, ''),
    whatsappNumber: (editClient?.whatsappNumber || '').replace(/^\+91/, ''),
    website: editClient?.website || '',
    pipelineStage: editClient?.pipelineStage || 'lead',
    source: editClient?.source || '',
    gstNumber: editClient?.gstNumber || '',
    cinNumber: editClient?.cinNumber || '',
  });

  const [sameAsWhatsApp, setSameAsWhatsApp] = useState(() => {
    const p = (editClient?.phoneNumber || '').replace(/^\+91/, '');
    const w = (editClient?.whatsappNumber || '').replace(/^\+91/, '');
    return !!(p && w && p === w);
  });

  const [address, setAddress] = useState({
    street: editClient?.address?.street || '',
    city: editClient?.address?.city || '',
    state: editClient?.address?.state || '',
    zipCode: editClient?.address?.zipCode || '',
    lat: editClient?.addressLat || null,
    lng: editClient?.addressLng || null,
  });
  const [isDummyAddress, setIsDummyAddress] = useState(editClient?.isDummyAddress || false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'phoneNumber' && sameAsWhatsApp) {
        next.whatsappNumber = val;
      }
      return next;
    });
  };

  const handleSameAsWhatsApp = (val) => {
    setSameAsWhatsApp(val);
    if (val) {
      setForm(prev => ({ ...prev, whatsappNumber: prev.phoneNumber }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Client name is required'); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      companyName: form.companyName.trim() || undefined,
      email: form.email.trim() || undefined,
      phoneNumber: form.phoneNumber ? `+91${form.phoneNumber}` : undefined,
      whatsappNumber: form.whatsappNumber ? `+91${form.whatsappNumber}` : undefined,
      website: form.website.trim() || undefined,
      pipelineStage: form.pipelineStage,
      source: form.source || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      cinNumber: form.cinNumber.trim() || undefined,
      isDummyAddress,
    };

    if (!isDummyAddress) {
      payload.address = {
        street: address.street.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
        zipCode: address.zipCode.trim() || undefined,
      };
      if (address.lat) payload.addressLat = address.lat;
      if (address.lng) payload.addressLng = address.lng;
    }

    try {
      if (isEdit) {
        await clientAPI.update(editClient._id, payload);
        Alert.alert('Success', 'Client updated');
        navigation.goBack();
      } else {
        await clientAPI.create(payload);
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save client');
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

  const ChipRow = ({ label, value, options, onSelect }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                backgroundColor: value === opt.value ? C.primary : C.surface,
                borderWidth: 1, borderColor: value === opt.value ? C.primary : C.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.value ? '#FFF' : C.text }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={isEdit ? 'Edit Client' : 'New Client'}
            backButton onBack={() => navigation.goBack()} isDark={isDark}
          />

          <SectionLabel title="Basic Info" />
          <Input
            label="Name *"
            icon="person-outline"
            placeholder="John Doe"
            value={form.name}
            onChangeText={set('name')}
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />
          <Input
            label="Company Name"
            icon="business-outline"
            placeholder="Acme Corp"
            value={form.companyName}
            onChangeText={set('companyName')}
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />

          <SectionLabel title="Contact" />
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="john@example.com"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />

          {/* Phone with same-as-WhatsApp */}
          <PhoneInput
            label="Phone"
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            isDark={isDark}
            style={{ marginBottom: 8 }}
          />
          {/* Same as WhatsApp toggle */}
          <TouchableOpacity
            onPress={() => handleSameAsWhatsApp(!sameAsWhatsApp)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 2 }}
            activeOpacity={0.7}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 4,
              borderWidth: 1.5, borderColor: sameAsWhatsApp ? '#22C55E' : C.inputBorder,
              backgroundColor: sameAsWhatsApp ? '#22C55E' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {sameAsWhatsApp && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Ionicons name="logo-whatsapp" size={16} color="#22C55E" />
            <Text style={{ fontSize: 13, color: C.textSecondary }}>Same number on WhatsApp</Text>
          </TouchableOpacity>

          {/* WhatsApp */}
          <PhoneInput
            label="WhatsApp"
            value={form.whatsappNumber}
            onChange={sameAsWhatsApp ? undefined : set('whatsappNumber')}
            isDark={isDark}
            style={{ marginBottom: 14, opacity: sameAsWhatsApp ? 0.6 : 1 }}
          />

          <Input
            label="Website"
            icon="globe-outline"
            placeholder="https://example.com"
            value={form.website}
            onChangeText={set('website')}
            autoCapitalize="none"
            keyboardType="url"
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />

          <SectionLabel title="Pipeline" />
          <ChipRow label="Stage" value={form.pipelineStage} options={PIPELINE_STAGES} onSelect={set('pipelineStage')} />
          <ChipRow label="Lead Source" value={form.source} options={SOURCES} onSelect={set('source')} />

          <SectionLabel title="Business" />
          <Input
            label="GST Number"
            icon="document-text-outline"
            placeholder="22AAAAA0000A1Z5"
            value={form.gstNumber}
            onChangeText={set('gstNumber')}
            autoCapitalize="characters"
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />
          <Input
            label="CIN Number"
            icon="document-outline"
            placeholder="U12345MH2020PTC123456"
            value={form.cinNumber}
            onChangeText={set('cinNumber')}
            autoCapitalize="characters"
            isDark={isDark}
            style={{ marginBottom: 14 }}
          />

          <SectionLabel title="Address" />
          <AddressSearch
            value={address}
            onChange={(fields) => setAddress(prev => ({ ...prev, ...fields }))}
            isDummy={isDummyAddress}
            onDummyChange={setIsDummyAddress}
            isDark={isDark}
          />

          <Button
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            {isEdit ? 'Update Client' : 'Create Client'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
