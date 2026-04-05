import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { dashboardAPI, taskAPI, meetingAPI } from '../../services/api';
import { getColors } from '../../utils/colors';
import {
  Card,
  Badge,
  SectionHeader,
  Avatar,
  ProgressBar,
  Spinner,
} from '../../components/ui';
import { formatINR, formatDateTime, getGreeting, isOverdue } from '../../utils/format';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: '#94A3B8' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { key: 'quotation_sent', label: 'Quotation', color: '#F59E0B' },
  { key: 'converted', label: 'Converted', color: '#10B981' },
  { key: 'lost', label: 'Lost', color: '#EF4444' },
];

const QUICK_ACTIONS = [
  { label: 'Task', icon: 'add-circle-outline', screen: 'CreateTask', tab: 'Tasks', color: '#2563EB' },
  { label: 'Meeting', icon: 'calendar-outline', screen: 'Meetings', tab: 'More', color: '#059669' },
  { label: 'Invoice', icon: 'receipt-outline', screen: 'Invoices', tab: 'Invoices', color: '#D97706' },
  { label: 'Client', icon: 'person-add-outline', screen: 'Clients', tab: 'Clients', color: '#7C3AED' },
];

export default function DashboardScreen({ navigation }) {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, tasksRes, meetingsRes] = await Promise.allSettled([
        dashboardAPI.getStats(),
        taskAPI.getAll({ limit: 5 }),
        meetingAPI.getAll({ limit: 5 }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || null);
      if (tasksRes.status === 'fulfilled') {
        const data = tasksRes.value.data?.data || tasksRes.value.data || [];
        setTasks(Array.isArray(data) ? data.slice(0, 5) : []);
      }
      if (meetingsRes.status === 'fulfilled') {
        const data = meetingsRes.value.data?.data || meetingsRes.value.data || [];
        setMeetings(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const upcomingMeetings = meetings.filter((m) => {
    try { return new Date(m.scheduledAt || m.date) > new Date() && m.status !== 'cancelled'; } catch { return false; }
  }).sort((a, b) => new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date)).slice(0, 3);

  const totalClients = stats?.clients?.total || 0;

  // Mini calendar helpers
  const [calMonth] = useState(new Date());
  const calDays = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const firstDow = startOfMonth(calMonth).getDay(); // 0=Sun
  const meetingDates = meetings.map(m => new Date(m.scheduledAt || m.date));

  function MiniCalendar() {
    const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <Card isDark={isDark}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 10 }}>
          {format(calMonth, 'MMMM yyyy')}
        </Text>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.textTertiary }}>{d}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <View key={`e${i}`} style={{ width: `${100/7}%` }} />
          ))}
          {calDays.map((day) => {
            const hasMeeting = meetingDates.some(md => isSameDay(md, day));
            const today = isToday(day);
            return (
              <View key={day.toISOString()} style={{ width: `${100/7}%`, alignItems: 'center', paddingVertical: 3 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: today ? C.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: today ? '700' : '400', color: today ? '#FFF' : C.text }}>
                    {format(day, 'd')}
                  </Text>
                </View>
                {hasMeeting && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981', marginTop: 1 }} />
                )}
              </View>
            );
          })}
        </View>
      </Card>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Greeting */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '500' }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.5 }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Spinner size="lg" color={C.primary} />
          </View>
        ) : (
          <>
            {/* Revenue Overview */}
            {stats?.invoices && (
              <View style={{ marginBottom: 24 }}>
                <SectionHeader title="Revenue Overview" isDark={isDark} actionLabel="View" onAction={() => navigation.navigate('Invoices')} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'Revenue', value: formatINR(stats.invoices.totalRevenue), icon: 'cash-outline', bg: '#ECFDF5', iconColor: '#059669', textColor: '#065F46' },
                    { label: 'Outstanding', value: formatINR(stats.invoices.totalDue), icon: 'time-outline', bg: '#FEF2F2', iconColor: '#DC2626', textColor: '#991B1B' },
                    { label: 'This Month', value: formatINR(stats.invoices.thisMonthRevenue), icon: 'calendar-outline', bg: C.primaryLight, iconColor: C.primary, textColor: C.primary },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => navigation.navigate('Invoices')}
                      style={{ flex: 1, backgroundColor: item.bg, borderRadius: 14, padding: 12 }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={item.icon} size={18} color={item.iconColor} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: item.textColor, marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                      <Text style={{ fontSize: 11, color: item.iconColor, fontWeight: '500', marginTop: 2 }}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Task Stats */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Tasks" isDark={isDark} actionLabel="View all" onAction={() => navigation.navigate('Tasks')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'Total', value: stats?.tasks?.total ?? tasks.length, icon: 'list-outline', bg: C.primaryLight, iconColor: C.primary },
                  { label: 'Pending', value: stats?.tasks?.pending ?? tasks.filter(t => t.status !== 'done').length, icon: 'hourglass-outline', bg: '#FFFBEB', iconColor: '#D97706' },
                  { label: 'Done', value: stats?.tasks?.done ?? tasks.filter(t => t.status === 'done').length, icon: 'checkmark-circle-outline', bg: '#ECFDF5', iconColor: '#059669' },
                  { label: 'Overdue', value: stats?.tasks?.overdue ?? tasks.filter(t => isOverdue(t.dueDate, t.status)).length, icon: 'alert-circle-outline', bg: '#FEF2F2', iconColor: '#DC2626' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => navigation.navigate('Tasks')}
                    style={{ width: '47.5%', backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Ionicons name={item.icon} size={18} color={item.iconColor} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{item.value}</Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '500', marginTop: 2 }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Quick Actions" isDark={isDark} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {QUICK_ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    onPress={() => navigation.navigate(action.tab)}
                    style={{
                      flex: 1,
                      backgroundColor: C.card,
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center',
                      gap: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: action.color + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name={action.icon} size={20} color={action.color} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary }}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calendar */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Calendar" isDark={isDark} actionLabel="Meetings" onAction={() => navigation.navigate('More')} />
              <MiniCalendar />
            </View>

            {/* Upcoming Meetings */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Upcoming Meetings" isDark={isDark} actionLabel="View all" onAction={() => navigation.navigate('More')} />
              <Card isDark={isDark} padding={false}>
                {upcomingMeetings.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={28} color={C.textTertiary} />
                    <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 8 }}>No upcoming meetings</Text>
                  </View>
                ) : (
                  upcomingMeetings.map((meeting, idx) => (
                    <TouchableOpacity
                      key={meeting._id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        borderBottomWidth: idx < upcomingMeetings.length - 1 ? 1 : 0,
                        borderBottomColor: C.borderLight,
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: meeting.meetingType === 'client' ? '#FEF3C7' : '#EDE9FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons
                          name={meeting.meetingType === 'client' ? 'briefcase-outline' : 'videocam-outline'}
                          size={20}
                          color={meeting.meetingType === 'client' ? '#D97706' : '#7C3AED'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
                          {meeting.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                          {formatDateTime(meeting.scheduledAt || meeting.date)}
                        </Text>
                      </View>
                      {meeting.meetLink && (
                        <View style={{
                          backgroundColor: C.primaryLight,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>Join</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </Card>
            </View>

            {/* Recent Tasks */}
            <View style={{ marginBottom: 24 }}>
              <SectionHeader title="Recent Tasks" isDark={isDark} actionLabel="View all" onAction={() => navigation.navigate('Tasks')} />
              <Card isDark={isDark} padding={false}>
                {tasks.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="checkbox-outline" size={28} color={C.textTertiary} />
                    <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 8 }}>No tasks yet</Text>
                  </View>
                ) : (
                  tasks.slice(0, 5).map((task, idx) => (
                    <TouchableOpacity
                      key={task._id}
                      onPress={() => navigation.navigate('Tasks')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        borderBottomWidth: idx < Math.min(tasks.length, 5) - 1 ? 1 : 0,
                        borderBottomColor: C.borderLight,
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: task.status === 'done' ? C.textTertiary : C.text,
                            textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                          }}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Badge status={task.status} />
                          {task.dueDate && (
                            <Text style={{ fontSize: 11, color: isOverdue(task.dueDate, task.status) ? '#DC2626' : C.textTertiary }}>
                              {task.dueDate?.split('T')[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                      {task.priority && <Badge status={task.priority} />}
                    </TouchableOpacity>
                  ))
                )}
              </Card>
            </View>

            {/* Client Pipeline */}
            {stats?.clients && (
              <View style={{ marginBottom: 24 }}>
                <SectionHeader title="Client Pipeline" isDark={isDark} actionLabel="View all" onAction={() => navigation.navigate('Clients')} />
                <Card isDark={isDark}>
                  {PIPELINE_STAGES.map((s) => (
                    <ProgressBar
                      key={s.key}
                      label={s.label}
                      value={stats.clients.byStage?.[s.key] || 0}
                      max={totalClients || 1}
                      color={s.color}
                      isDark={isDark}
                    />
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontSize: 13, color: C.textSecondary }}>Total Clients</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{totalClients}</Text>
                  </View>
                </Card>
              </View>
            )}

            {/* Invoice Status */}
            {stats?.invoices && (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title="Invoice Status" isDark={isDark} actionLabel="View all" onAction={() => navigation.navigate('Invoices')} />
                <Card isDark={isDark}>
                  <ProgressBar label="Paid" value={stats.invoices.paid} max={stats.invoices.total || 1} color="#10B981" isDark={isDark} />
                  <ProgressBar label="Partial" value={stats.invoices.partial} max={stats.invoices.total || 1} color="#F59E0B" isDark={isDark} />
                  <ProgressBar label="Unpaid" value={stats.invoices.unpaid} max={stats.invoices.total || 1} color="#EF4444" isDark={isDark} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>Collected</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#065F46', marginTop: 2 }}>
                        {formatINR(stats.invoices.totalRevenue)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Outstanding</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#991B1B', marginTop: 2 }}>
                        {formatINR(stats.invoices.totalDue)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
