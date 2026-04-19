import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Spinner, ScreenHeader, Avatar, Button, Badge, AppModal, Input } from '../../components/ui';

const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'org_admin',  label: 'Admin' },
  { value: 'employee',   label: 'Employee' },
];

function DetailRow({ icon, label, value, C }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={16} color={C.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 14, color: C.text, fontWeight: '500', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function UserDetailScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const { user: me } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [u, setU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userAPI.getById(userId);
      setU(res.data?.data || res.data);
    } catch {
      setU(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const canManage = me?.role === 'superadmin' || me?.role === 'product_owner' || me?.role === 'org_admin';
  const isSelf = u?._id === me?._id;

  const handleToggleActive = async () => {
    try {
      await userAPI.update(userId, { isActive: !u.isActive });
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update');
    }
  };

  const handleChangeRole = async (role) => {
    setRolePickerOpen(false);
    if (!role || role === u.role) return;
    setUpdatingRole(true);
    try {
      await userAPI.update(userId, { role });
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to change role');
    }
    setUpdatingRole(false);
  };

  const openEdit = () => {
    setForm({ name: u.name || '', email: u.email || '' });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.update(userId, form);
      setEditOpen(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete user', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userAPI.delete(userId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (!u) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="User" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader title="User" backButton onBack={() => navigation.goBack()} isDark={isDark} />

        <Card isDark={isDark} style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 16 }}>
          <Avatar name={u.name || u.email} size="xl" />
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginTop: 14 }}>{u.name || 'No name'}</Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{u.email}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Badge>{roleLabel}</Badge>
            {u.isActive === false ? <Badge status="cancelled">Inactive</Badge> : <Badge status="active">Active</Badge>}
          </View>
        </Card>

        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Profile</Text>
          <DetailRow icon="mail-outline" label="Email" value={u.email} C={C} />
          <DetailRow icon="call-outline" label="Phone" value={u.phoneNumber} C={C} />
          <DetailRow icon="business-outline" label="Organization" value={u.organizationId?.name || '—'} C={C} />
          <DetailRow icon="calendar-outline" label="Joined" value={u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} C={C} />
          {u.mpinEnabled && <DetailRow icon="keypad-outline" label="MPIN" value="Enabled" C={C} />}
          {u.biometricEnabled && <DetailRow icon="finger-print-outline" label="Biometric" value="Enabled" C={C} />}
        </Card>

        {canManage && !isSelf && (
          <View style={{ gap: 10 }}>
            <Button onPress={openEdit} icon="create-outline" isDark={isDark}>Edit Profile</Button>
            <Button onPress={() => setRolePickerOpen(true)} loading={updatingRole} variant="outline" icon="shield-outline" isDark={isDark}>
              Change Role
            </Button>
            <Button onPress={handleToggleActive} variant="outline" icon={u.isActive === false ? 'play-outline' : 'pause-outline'} isDark={isDark}>
              {u.isActive === false ? 'Activate' : 'Deactivate'}
            </Button>
            <Button onPress={handleDelete} variant="danger" icon="trash-outline" isDark={isDark}>Delete User</Button>
          </View>
        )}
      </ScrollView>

      <AppModal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" isDark={isDark} size="sm">
        <Input label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} isDark={isDark} style={{ marginBottom: 12 }} />
        <Input label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} isDark={isDark} style={{ marginBottom: 16 }} keyboardType="email-address" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" onPress={() => setEditOpen(false)} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={handleSave} loading={saving} isDark={isDark} style={{ flex: 1 }}>Save</Button>
        </View>
      </AppModal>

      <AppModal isOpen={rolePickerOpen} onClose={() => setRolePickerOpen(false)} title="Change Role" isDark={isDark} size="sm">
        {ROLE_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            onPress={() => handleChangeRole(r.value)}
            style={{
              padding: 14, borderRadius: 12, marginBottom: 8,
              borderWidth: 1, borderColor: u.role === r.value ? C.primary + '80' : C.border,
              backgroundColor: u.role === r.value ? C.primaryLight : 'transparent',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </AppModal>
    </SafeAreaView>
  );
}
