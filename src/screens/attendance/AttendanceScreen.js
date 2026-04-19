import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { attendanceAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Button, Spinner, ScreenHeader } from '../../components/ui';

function msToHHMM(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function AttendanceScreen({ navigation }) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [liveMs, setLiveMs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        attendanceAPI.myToday(),
        attendanceAPI.myHistory(),
      ]);
      setToday(t.data?.data || null);
      setHistory(h.data?.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!today?.loginAt) { setLiveMs(0); return; }
    const start = new Date(today.loginAt).getTime();
    setLiveMs(Date.now() - start);
    const id = setInterval(() => setLiveMs(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [today?.loginAt]);

  const handleClockIn = async () => {
    setBusy(true);
    try {
      const res = await attendanceAPI.clockIn();
      setToday(res.data?.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to clock in');
    }
    setBusy(false);
  };

  const handleClockOut = async () => {
    setBusy(true);
    try {
      const res = await attendanceAPI.clockOut();
      setToday(res.data?.data);
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to clock out');
    }
    setBusy(false);
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'org_admin';
  const running = !!today?.loginAt;
  const totalTodayMs = (today?.totalDurationMs || 0) + (running ? liveMs : 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Attendance"
          subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
          actionIcon={isAdmin ? 'people-outline' : undefined}
          onAction={isAdmin ? () => navigation.navigate('Timesheet') : undefined}
        />

        {/* Today */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: running ? C.success : C.border,
            }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {running ? 'Currently clocked in' : today ? 'Not clocked in' : 'No session today'}
            </Text>
          </View>

          <Text style={{ fontSize: 36, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], marginBottom: 4 }}>
            {msToHHMM(totalTodayMs)}
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
            {today?.sessions?.length || 0} completed session{(today?.sessions?.length || 0) === 1 ? '' : 's'} today
          </Text>

          {running ? (
            <Button onPress={handleClockOut} loading={busy} variant="danger" icon="log-out-outline" isDark={isDark}>
              Clock Out
            </Button>
          ) : (
            <Button onPress={handleClockIn} loading={busy} icon="log-in-outline" isDark={isDark}>
              Clock In
            </Button>
          )}
          {running && (
            <Text style={{ fontSize: 11, color: C.textTertiary, textAlign: 'center', marginTop: 10 }}>
              Started at {fmtTime(today.loginAt)}
            </Text>
          )}

          {/* Today's sessions */}
          {(today?.sessions?.length > 0 || running) && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                Today's sessions
              </Text>
              <View style={{ gap: 8 }}>
                {(today?.sessions || []).map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time-outline" size={13} color={C.textTertiary} />
                      <Text style={{ fontSize: 13, color: C.text }}>
                        {fmtTime(s.startAt)} → {fmtTime(s.endAt)}
                      </Text>
                      {s.systemCheckout && (
                        <Text style={{ fontSize: 10, color: C.warning, fontWeight: '700', backgroundColor: C.warningLight, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>AUTO</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>
                      {msToHHMM(s.durationMs)}
                    </Text>
                  </View>
                ))}
                {running && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="play" size={13} color={C.success} />
                      <Text style={{ fontSize: 13, color: C.success }}>
                        {fmtTime(today.loginAt)} → (running)
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.success, fontVariant: ['tabular-nums'] }}>
                      {msToHHMM(liveMs)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* History */}
        <Card isDark={isDark}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>This month</Text>
          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Spinner />
            </View>
          ) : history.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', paddingVertical: 30 }}>
              No sessions yet this month.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {history.map((e) => {
                const d = new Date(e.date + 'T00:00:00');
                const weekend = isWeekend(e.date);
                const first = e.sessions?.[0]?.startAt;
                const last = e.sessions?.[e.sessions.length - 1]?.endAt || e.loginAt;
                const hasAuto = e.sessions?.some((s) => s.systemCheckout);
                return (
                  <View
                    key={e._id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: weekend ? C.surface : 'transparent',
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                          {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Text>
                        <Text style={{ fontSize: 11, color: weekend ? C.textTertiary : C.textSecondary }}>
                          · {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                          {weekend ? ' (off)' : ''}
                        </Text>
                        {hasAuto && (
                          <Text style={{ fontSize: 9, color: C.warning, fontWeight: '700', backgroundColor: C.warningLight, paddingHorizontal: 4, borderRadius: 3 }}>
                            AUTO
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
                        {fmtTime(first)} → {last ? fmtTime(last) : (e.loginAt ? 'Active' : '—')} · {e.sessions?.length || 0} session{e.sessions?.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] }}>
                      {msToHHMM(e.totalDurationMs)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
