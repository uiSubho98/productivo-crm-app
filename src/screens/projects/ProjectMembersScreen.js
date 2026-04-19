import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { projectAPI, projectMembersAPI, userAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, ScreenHeader, Avatar, Spinner, Button, AppModal, EmptyState, SearchInput } from '../../components/ui';

const ROLE_OPTIONS = [
  { value: 'lead',      label: 'Lead' },
  { value: 'member',    label: 'Member' },
  { value: 'viewer',    label: 'Viewer' },
];

function RolePill({ role, C }) {
  const label = ROLE_OPTIONS.find((r) => r.value === role)?.label || role || 'Member';
  return (
    <View style={{
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
      backgroundColor: C.primaryLight,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

export default function ProjectMembersScreen({ route, navigation }) {
  const { projectId } = route.params || {};
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // existing member
  const [busy, setBusy] = useState(false);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('member');

  const load = useCallback(async () => {
    try {
      const res = await projectAPI.getById(projectId);
      setProject(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!addOpen) return;
    userAPI.getAll()
      .then((r) => {
        const list = r.data?.data?.users || r.data?.data || r.data || [];
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => setUsers([]));
  }, [addOpen]);

  const members = project?.members || [];
  const memberIds = useMemo(() => new Set(members.map((m) => String(m._id || m.userId))), [members]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users
      .filter((u) => !memberIds.has(String(u._id)))
      .filter((u) => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [users, userSearch, memberIds]);

  const openAdd = () => {
    setSelectedUser(null);
    setSelectedRole('member');
    setUserSearch('');
    setAddOpen(true);
  };

  const openEdit = (member) => {
    setEditTarget(member);
    setSelectedRole(member.role || 'member');
  };

  const handleAdd = async () => {
    if (!selectedUser) {
      Alert.alert('Pick a user', 'Select a user to add.');
      return;
    }
    setBusy(true);
    try {
      await projectMembersAPI.add(projectId, { userId: selectedUser._id, role: selectedRole });
      setAddOpen(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.response?.data?.message || 'Failed to add member');
    }
    setBusy(false);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setBusy(true);
    try {
      await projectMembersAPI.update(projectId, editTarget._id, { role: selectedRole });
      setEditTarget(null);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update member');
    }
    setBusy(false);
  };

  const handleRemove = (member) => {
    Alert.alert(
      'Remove member',
      `Remove ${member.name || 'this member'} from the project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectMembersAPI.remove(projectId, member._id);
              load();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Project Members"
          subtitle={project?.name}
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
          actionIcon="person-add-outline"
          onAction={openAdd}
        />

        {members.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No members yet"
            subtitle="Add teammates to collaborate on this project."
            actionLabel="Add Member"
            onAction={openAdd}
            isDark={isDark}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {members.map((m) => (
              <Card key={m._id} isDark={isDark}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.name || m.email} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{m.name || 'Unknown'}</Text>
                    {m.email ? <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{m.email}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <RolePill role={m.role} C={C} />
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => openEdit(m)}
                    style={{ padding: 8, borderRadius: 8, backgroundColor: C.surface }}
                  >
                    <Ionicons name="create-outline" size={18} color={C.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(m)}
                    style={{ padding: 8, borderRadius: 8, backgroundColor: C.dangerLight }}
                  >
                    <Ionicons name="close" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <AppModal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Member" isDark={isDark}>
        <SearchInput value={userSearch} onChangeText={setUserSearch} placeholder="Search users…" isDark={isDark} style={{ marginBottom: 12 }} />
        <ScrollView style={{ maxHeight: 260, marginBottom: 14 }}>
          {filteredUsers.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
              No users available to add.
            </Text>
          ) : (
            filteredUsers.map((u) => {
              const active = selectedUser?._id === u._id;
              return (
                <TouchableOpacity
                  key={u._id}
                  onPress={() => setSelectedUser(u)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 10, marginBottom: 6,
                    borderWidth: 1,
                    borderColor: active ? C.primary + '80' : C.border,
                    backgroundColor: active ? C.primaryLight : 'transparent',
                  }}
                >
                  <Avatar name={u.name || u.email} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{u.name || 'Unknown'}</Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{u.email}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={18} color={C.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Role</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {ROLE_OPTIONS.map((r) => {
            const active = selectedRole === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                onPress={() => setSelectedRole(r.value)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  borderWidth: 1,
                  borderColor: active ? C.primary : C.border,
                  backgroundColor: active ? C.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFF' : C.text }}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="outline" onPress={() => setAddOpen(false)} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={handleAdd} loading={busy} isDark={isDark} style={{ flex: 1 }}>Add</Button>
        </View>
      </AppModal>

      {/* Edit Role Modal */}
      <AppModal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Role" isDark={isDark} size="sm">
        {editTarget && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar name={editTarget.name || editTarget.email} size="md" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{editTarget.name}</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>{editTarget.email}</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Role</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {ROLE_OPTIONS.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setSelectedRole(r.value)}
                    style={{
                      padding: 12, borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? C.primary + '80' : C.border,
                      backgroundColor: active ? C.primaryLight : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" onPress={() => setEditTarget(null)} isDark={isDark} style={{ flex: 1 }}>Cancel</Button>
              <Button onPress={handleUpdate} loading={busy} isDark={isDark} style={{ flex: 1 }}>Save</Button>
            </View>
          </>
        )}
      </AppModal>
    </SafeAreaView>
  );
}
