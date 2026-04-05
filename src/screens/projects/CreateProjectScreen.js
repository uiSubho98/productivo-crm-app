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
import { projectAPI, clientAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Input, Button, Card, ScreenHeader, DatePicker } from '../../components/ui';

const STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function CreateProjectScreen({ route, navigation }) {
  const editProject = route?.params?.project;
  const isEdit = !!editProject;
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [form, setForm] = useState({
    name: editProject?.name || '',
    description: editProject?.description || '',
    status: editProject?.status || 'planning',
    startDate: editProject?.startDate?.split('T')[0] || '',
    endDate: editProject?.endDate?.split('T')[0] || '',
    domain: editProject?.domain || '',
    clientId: editProject?.clientId?._id || editProject?.clientId || '',
    envFile: editProject?.envFile || '',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDataLoading(true);
    clientAPI.getAll({ limit: 100 }).then(r => {
      const data = r.data?.data || r.data || [];
      setClients(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, []);

  const set = (key) => (val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Project name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      e.endDate = 'End date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickEnvFile = async () => {
    let DocumentPicker;
    try {
      DocumentPicker = require('expo-document-picker');
    } catch {
      Alert.alert('Not available', 'Document picker requires a development build. Please paste your .env content directly.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0] || result;
      const response = await fetch(asset.uri);
      const text = await response.text();
      set('envFile')(text);
    } catch {
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Error', Object.values(errors)[0] || 'Please fix the errors');
      return;
    }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      domain: form.domain.trim() || undefined,
      clientId: form.clientId || undefined,
      envFile: form.envFile.trim() || undefined,
    };
    try {
      if (isEdit) {
        await projectAPI.update(editProject._id, payload);
        Alert.alert('Success', 'Project updated');
        navigation.goBack();
      } else {
        await projectAPI.create(payload);
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save project');
    }
    setLoading(false);
  };

  const OptionRow = ({ label, value, options, onSelect }) => (
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
                borderWidth: 1,
                borderColor: value === opt.value ? C.primary : C.border,
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
            title={isEdit ? 'Edit Project' : 'New Project'}
            backButton onBack={() => navigation.goBack()} isDark={isDark}
          />

          {dataLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: 14 }}>Loading...</Text>
            </View>
          ) : (
            <>
              <Input
                label="Project Name *"
                icon="folder-outline"
                placeholder="My Awesome Project"
                value={form.name}
                onChangeText={set('name')}
                error={errors.name}
                isDark={isDark}
                style={{ marginBottom: 16 }}
              />

              <Input
                label="Description"
                placeholder="What is this project about?"
                value={form.description}
                onChangeText={set('description')}
                multiline
                numberOfLines={4}
                isDark={isDark}
                style={{ marginBottom: 16 }}
                inputStyle={{ height: 90, textAlignVertical: 'top' }}
              />

              <OptionRow label="Status" value={form.status} options={STATUSES} onSelect={set('status')} />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <DatePicker
                    label="Start Date"
                    value={form.startDate}
                    onChange={set('startDate')}
                    isDark={isDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DatePicker
                    label="End Date"
                    value={form.endDate}
                    onChange={set('endDate')}
                    isDark={isDark}
                  />
                  {errors.endDate ? <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{errors.endDate}</Text> : null}
                </View>
              </View>

              <Input
                label="Domain / URL"
                icon="globe-outline"
                placeholder="https://example.com"
                value={form.domain}
                onChangeText={set('domain')}
                autoCapitalize="none"
                keyboardType="url"
                isDark={isDark}
                style={{ marginBottom: 16 }}
              />

              {/* Client Selector */}
              {clients.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Client</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => set('clientId')('')}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                          backgroundColor: !form.clientId ? C.primary : C.surface,
                          borderWidth: 1, borderColor: !form.clientId ? C.primary : C.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: !form.clientId ? '#FFF' : C.text }}>None</Text>
                      </TouchableOpacity>
                      {clients.map((c) => (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => set('clientId')(c._id)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                            backgroundColor: form.clientId === c._id ? C.primary : C.surface,
                            borderWidth: 1, borderColor: form.clientId === c._id ? C.primary : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: form.clientId === c._id ? '#FFF' : C.text }}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* .env File */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary }}>.env File</Text>
                  <TouchableOpacity
                    onPress={handlePickEnvFile}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color={C.primary} />
                    <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>Upload .env</Text>
                  </TouchableOpacity>
                </View>
                <View style={{
                  backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
                  borderRadius: 12, padding: 12,
                }}>
                  <TextInput
                    placeholder={'DATABASE_URL=\nAPI_KEY=\nSECRET='}
                    value={form.envFile}
                    onChangeText={set('envFile')}
                    multiline
                    numberOfLines={6}
                    placeholderTextColor={C.placeholder}
                    style={{
                      fontSize: 13, color: C.text, height: 130,
                      textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    }}
                  />
                </View>
                <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>
                  Upload a .env file or paste variables directly.
                </Text>
              </View>

              <Button onPress={handleSubmit} loading={loading} size="lg" isDark={isDark}>
                {isEdit ? 'Update Project' : 'Create Project'}
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
