import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { organizationAPI, uploadAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Input, Button, ScreenHeader, PhoneInput } from '../../components/ui';
import AddressSearch from '../../components/AddressSearch';

export default function CreateOrganizationScreen({ route, navigation }) {
  const editOrg = route?.params?.org;
  const isEdit = !!route?.params?.edit && !!editOrg;

  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    cinNumber: '',
    taxPercentage: '',
  });
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', lat: null, lng: null });
  const [isDummyAddress, setIsDummyAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (isEdit && editOrg) {
      setForm({
        name: editOrg.name || '',
        phone: (editOrg.phone || '').replace(/^\+91/, ''),
        website: editOrg.website || '',
        cinNumber: editOrg.cinNumber || '',
        taxPercentage: editOrg.taxPercentage != null ? String(editOrg.taxPercentage) : '',
      });
      setIsDummyAddress(editOrg.isDummyAddress || false);
      setAddress({
        street: editOrg.address?.street || '',
        city: editOrg.address?.city || '',
        state: editOrg.address?.state || '',
        zipCode: editOrg.address?.zipCode || '',
        lat: editOrg.addressLat || null,
        lng: editOrg.addressLng || null,
      });
      if (editOrg.logo) {
        setLogoPreview(editOrg.logo);
        setLogoUrl(editOrg.logo);
      }
    }
  }, [isEdit]);

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Organization name is required';
    if (form.taxPercentage && isNaN(Number(form.taxPercentage))) e.taxPercentage = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickLogo = async () => {
    let ImagePicker;
    try {
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Not available', 'Image picker requires a development build. Please rebuild the app.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setLogoPreview(asset.uri);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', {
        uri: asset.uri,
        name: asset.fileName || `logo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
      fd.append('folder', 'logos');
      const res = await uploadAPI.upload(fd);
      const url = res.data?.data?.url || res.data?.url;
      setLogoUrl(url);
    } catch {
      Alert.alert('Error', 'Failed to upload logo. Try again.');
      setLogoPreview(null);
      setLogoUrl('');
    }
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoUrl('');
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone ? `+91${form.phone}` : undefined,
      website: form.website.trim() || undefined,
      cinNumber: form.cinNumber.trim() || undefined,
      taxPercentage: form.taxPercentage ? Number(form.taxPercentage) : undefined,
      logo: logoUrl || undefined,
      isDummyAddress,
    };

    if (!isDummyAddress) {
      const hasAddr = address.street || address.city || address.state || address.zipCode;
      if (hasAddr) {
        payload.address = {
          street: address.street.trim() || undefined,
          city: address.city.trim() || undefined,
          state: address.state.trim() || undefined,
          zipCode: address.zipCode.trim() || undefined,
        };
        if (address.lat) payload.addressLat = address.lat;
        if (address.lng) payload.addressLng = address.lng;
      }
    }

    try {
      if (isEdit) {
        await organizationAPI.update(editOrg._id, payload);
        Alert.alert('Success', 'Organization updated');
        navigation.goBack();
      } else {
        const res = await organizationAPI.create(payload);
        const created = res.data?.data || res.data;
        Alert.alert('Success', 'Organization created');
        navigation.replace('OrganizationDetail', { orgId: created._id, org: created });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save organization');
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={isEdit ? 'Edit Organization' : 'New Organization'}
            backButton
            onBack={() => navigation.goBack()}
            isDark={isDark}
          />

          {/* Logo Upload */}
          <SectionLabel title="Logo" />
          <Card isDark={isDark} style={{ marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {logoPreview ? (
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: logoPreview }}
                    style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: C.surface }}
                  />
                  {uploading && (
                    <View style={{
                      position: 'absolute', inset: 0, borderRadius: 16,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      alignItems: 'center', justifyContent: 'center',
                      width: 80, height: 80,
                    }}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                  {!uploading && (
                    <TouchableOpacity
                      onPress={handleRemoveLogo}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={13} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickLogo}
                  style={{
                    width: 80, height: 80, borderRadius: 16,
                    borderWidth: 2, borderStyle: 'dashed', borderColor: C.border,
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={24} color={C.textTertiary} />
                  <Text style={{ fontSize: 10, color: C.textTertiary }}>Upload</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>Company Logo</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>PNG, JPG up to 10MB</Text>
                {!logoPreview && (
                  <TouchableOpacity onPress={handlePickLogo} style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>Choose Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>

          <SectionLabel title="Basic Info" />
          <Card isDark={isDark} style={{ gap: 14 }}>
            <Input
              label="Organization Name *"
              icon="business-outline"
              placeholder="Acme Corp"
              value={form.name}
              onChangeText={set('name')}
              error={errors.name}
              isDark={isDark}
            />
            <PhoneInput
              label="Phone"
              value={form.phone}
              onChange={set('phone')}
              isDark={isDark}
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
            />
          </Card>

          <SectionLabel title="Address" />
          <Card isDark={isDark}>
            <AddressSearch
              value={address}
              onChange={(fields) => setAddress(prev => ({ ...prev, ...fields }))}
              isDummy={isDummyAddress}
              onDummyChange={setIsDummyAddress}
              isDark={isDark}
            />
          </Card>

          <SectionLabel title="Tax & Legal" />
          <Card isDark={isDark} style={{ gap: 14 }}>
            <Input
              label="CIN Number"
              icon="document-text-outline"
              placeholder="U12345MH2020PTC123456"
              value={form.cinNumber}
              onChangeText={set('cinNumber')}
              autoCapitalize="characters"
              isDark={isDark}
            />
            <Input
              label="Tax Percentage (%)"
              icon="calculator-outline"
              placeholder="18"
              value={form.taxPercentage}
              onChangeText={(v) => set('taxPercentage')(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              keyboardType="decimal-pad"
              error={errors.taxPercentage}
              isDark={isDark}
            />
          </Card>

          <Button
            onPress={handleSubmit}
            loading={loading}
            disabled={uploading}
            size="lg"
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            {isEdit ? 'Update Organization' : 'Create Organization'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
