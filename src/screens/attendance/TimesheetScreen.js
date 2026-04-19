import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { attendanceAPI, API_BASE_URL } from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, ScreenHeader, Spinner, DatePicker, AppModal, Button } from '../../components/ui';

function msToHHMM(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function TimesheetScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([
        attendanceAPI.listMembers(),
        attendanceAPI.adminList({ from, to, userId: userId || undefined }),
      ]);
      setMembers(m.data?.data || []);
      setEntries(e.data?.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load timesheet');
      setEntries([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [userId, from, to]);

  const handleExport = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing not available', "This device can't share files.");
      return;
    }
    setExporting(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const params = new URLSearchParams({ from, to });
      if (userId) params.append('userId', userId);
      const url = `${API_BASE_URL}/attendance/export?${params.toString()}`;
      const dest = `${FileSystem.cacheDirectory}timesheet_${from}_to_${to}.xlsx`;
      const res = await FileSystem.downloadAsync(url, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      await Sharing.shareAsync(res.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Timesheet export',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Could not export timesheet');
    }
    setExporting(false);
  };

  const totalMs = entries.reduce((s, e) => s + (e.totalDurationMs || 0), 0);
  const totalTaskMs = entries.reduce((s, e) => s + (e.taskTotalMs || 0), 0);
  const workDays = entries.filter((e) => !e.weekend && e.totalDurationMs > 0).length;

  const selectedMember = members.find((m) => m._id === userId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Timesheet"
          subtitle="Team attendance"
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
        />

        <Button
          onPress={handleExport}
          loading={exporting}
          variant="outline"
          icon="download-outline"
          isDark={isDark}
          style={{ marginBottom: 14 }}
        >
          Export to Excel
        </Button>

        {/* Filters */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Team Member
          </Text>
          <TouchableOpacity
            onPress={() => setMemberPickerOpen(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
            }}
          >
            <Ionicons name="person-outline" size={17} color={C.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, color: C.text }}>
              {selectedMember ? `${selectedMember.name} · ${selectedMember.role}` : 'All members'}
            </Text>
            <Ionicons name="chevron-down" size={15} color={C.textTertiary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DatePicker label="From" value={from} onChange={setFrom} isDark={isDark} style={{ flex: 1 }} />
            <DatePicker label="To" value={to} onChange={setTo} isDark={isDark} style={{ flex: 1 }} />
          </View>
        </Card>

        {/* Summary */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card isDark={isDark} style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Hours</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginTop: 4, fontVariant: ['tabular-nums'] }}>
              {msToHHMM(totalMs)}
            </Text>
          </Card>
          <Card isDark={isDark} style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>Task Time</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginTop: 4, fontVariant: ['tabular-nums'] }}>
              {msToHHMM(totalTaskMs)}
            </Text>
          </Card>
          <Card isDark={isDark} style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>Work Days</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginTop: 4 }}>{workDays}</Text>
          </Card>
        </View>

        {/* Entries */}
        <Card isDark={isDark}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Entries</Text>
          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}><Spinner /></View>
          ) : entries.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingVertical: 30 }}>No entries.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {entries.map((e) => {
                const first = e.sessions?.[0]?.startAt;
                const last = e.sessions?.[e.sessions.length - 1]?.endAt || e.loginAt;
                return (
                  <View
                    key={e._id}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 12, paddingVertical: 10,
                      borderRadius: 10, borderWidth: 1, borderColor: C.border,
                      backgroundColor: e.weekend ? C.surface : 'transparent',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                        {e.date} · {e.userName || e.user?.name || 'User'}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
                        {fmtTime(first)} → {last ? fmtTime(last) : '—'} · {e.sessions?.length || 0} session{e.sessions?.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>
                      {msToHHMM(e.totalDurationMs)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

      </ScrollView>

      <AppModal isOpen={memberPickerOpen} onClose={() => setMemberPickerOpen(false)} title="Team Member" isDark={isDark} size="sm">
        <ScrollView style={{ maxHeight: 400 }}>
          <TouchableOpacity
            onPress={() => { setUserId(''); setMemberPickerOpen(false); }}
            style={{
              padding: 12, borderRadius: 10, marginBottom: 6,
              backgroundColor: !userId ? C.primaryLight : 'transparent',
              borderWidth: 1, borderColor: !userId ? C.primary + '40' : C.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>All members</Text>
          </TouchableOpacity>
          {members.map((m) => (
            <TouchableOpacity
              key={m._id}
              onPress={() => { setUserId(m._id); setMemberPickerOpen(false); }}
              style={{
                padding: 12, borderRadius: 10, marginBottom: 6,
                backgroundColor: userId === m._id ? C.primaryLight : 'transparent',
                borderWidth: 1, borderColor: userId === m._id ? C.primary + '40' : C.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{m.name}</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{m.role} · {m.email}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppModal>
    </SafeAreaView>
  );
}
