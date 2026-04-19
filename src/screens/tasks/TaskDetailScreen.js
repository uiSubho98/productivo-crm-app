import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI, whatsappAddonAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import useWhatsappAddonStore from '../../store/whatsappAddonStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, Avatar, ScreenHeader, Button, AppModal } from '../../components/ui';
import { formatDate, formatDateTime, capitalize } from '../../utils/format';

function DetailRow({ icon, label, value, isDark }) {
  const C = getColors(isDark);
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={18} color={C.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: C.textTertiary, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params || {};
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timerBusy, setTimerBusy] = useState(false);
  const [timeLogs, setTimeLogs] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [remindingId, setRemindingId] = useState(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskBusy, setSubtaskBusy] = useState(false);
  const { features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const waTaskActive = waFeatures?.task_reminder?.isActive;

  useEffect(() => { if (!waFetched) fetchWaAddon(); }, [waFetched]);

  const fetchTask = async () => {
    try {
      const res = await taskAPI.getById(taskId);
      setTask(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const toggleSubtask = async (subtask) => {
    const nextStatus = subtask.status === 'done' ? 'todo' : 'done';
    try {
      await taskAPI.updateSubtask(taskId, subtask._id, { status: nextStatus });
      await fetchTask();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update subtask');
    }
  };

  const addSubtask = async () => {
    const title = newSubtask.trim();
    if (!title) return;
    setSubtaskBusy(true);
    try {
      await taskAPI.addSubtask(taskId, { title });
      setNewSubtask('');
      await fetchTask();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add subtask');
    } finally {
      setSubtaskBusy(false);
    }
  };

  const fetchTimer = async () => {
    try {
      const [tRes, lRes] = await Promise.all([
        taskAPI.getTimer(taskId).catch(() => ({ data: { data: null } })),
        taskAPI.getTimeLogs(taskId).catch(() => ({ data: { data: [] } })),
      ]);
      setTimer(tRes.data?.data || null);
      setTimeLogs(lRes.data?.data || []);
    } catch {}
  };

  useEffect(() => { fetchTask(); fetchTimer(); }, [taskId]);

  const handleTimerToggle = async () => {
    setTimerBusy(true);
    try {
      if (timer?.running) {
        await taskAPI.stopTimer(taskId);
      } else {
        await taskAPI.startTimer(taskId);
      }
      await fetchTimer();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Timer action failed');
    }
    setTimerBusy(false);
  };

  const handleSendReminder = async (assignee) => {
    if (!waTaskActive) {
      Alert.alert(
        'Add-on required',
        'Task reminders via WhatsApp require the Task Reminder add-on.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Add-ons', onPress: () => navigation.navigate('PremiumFeatures') },
        ]
      );
      return;
    }
    if (!assignee?.phoneNumber) {
      Alert.alert('Missing phone', `${assignee?.name || 'This user'} has no phone number on file.`);
      return;
    }
    setRemindingId(assignee._id);
    try {
      await whatsappAddonAPI.sendTaskReminder(taskId, { assigneeId: assignee._id });
      setShowReminderModal(false);
      Alert.alert('Sent', `Reminder sent to ${assignee.name} via WhatsApp.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send reminder');
    }
    setRemindingId(null);
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskAPI.delete(taskId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await taskAPI.update(taskId, { status: newStatus });
      setTask(res.data?.data || res.data);
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="Task" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const STATUS_OPTIONS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

  const recurrenceLabel = task.recurrence && task.recurrence !== 'none'
    ? capitalize(task.recurrence)
    : null;

  const recurrenceDaysLabel = task.recurrenceDays?.length > 0
    ? task.recurrenceDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTask(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Task Detail"
          backButton
          onBack={() => navigation.goBack()}
          actionIcon="create-outline"
          onAction={() => navigation.navigate('CreateTask', { task })}
          isDark={isDark}
        />

        {/* Title */}
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 16, letterSpacing: -0.3 }}>
          {task.title}
        </Text>

        {/* Status & Priority Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <Badge status={task.status} />
          {task.priority && <Badge status={task.priority} />}
        </View>

        {/* Change Status */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 10 }}>Update Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: task.status === s ? C.primary : C.surface,
                    borderWidth: 1, borderColor: task.status === s ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: task.status === s ? '#FFF' : C.text, textTransform: 'capitalize' }}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Timer */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>Time Tracking</Text>
            {timer?.running && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Running</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>
                {(() => {
                  const mins = timer?.totalMinutes ?? timer?.totalSeconds ? Math.round((timer?.totalSeconds || 0) / 60) : (timer?.totalMinutes || 0);
                  const hours = Math.floor(mins / 60);
                  const rem = mins % 60;
                  return hours > 0 ? `${hours}h ${rem}m` : `${rem}m`;
                })()}
              </Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
                {timeLogs.length} session{timeLogs.length === 1 ? '' : 's'} logged
              </Text>
            </View>
            <Button
              onPress={handleTimerToggle}
              loading={timerBusy}
              variant={timer?.running ? 'danger' : 'primary'}
              icon={timer?.running ? 'stop' : 'play'}
              size="sm"
              isDark={isDark}
            >
              {timer?.running ? 'Stop' : 'Start'}
            </Button>
          </View>
        </Card>

        {/* Details */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 16 }}>Details</Text>
          <View style={{ gap: 14 }}>
            <DetailRow icon="calendar-outline" label="Due Date" value={task.dueDate ? formatDate(task.dueDate) : 'Not set'} isDark={isDark} />
            <DetailRow icon="flag-outline" label="Priority" value={task.priority ? capitalize(task.priority) : 'Not set'} isDark={isDark} />
            <DetailRow icon="folder-outline" label="Project" value={task.projectId?.name || 'None'} isDark={isDark} />
            <DetailRow icon="time-outline" label="Created At" value={task.createdAt ? formatDateTime(task.createdAt) : '—'} isDark={isDark} />
            <DetailRow icon="refresh-outline" label="Updated At" value={task.updatedAt ? formatDateTime(task.updatedAt) : '—'} isDark={isDark} />
            {recurrenceLabel && (
              <DetailRow icon="repeat-outline" label="Recurrence" value={recurrenceLabel} isDark={isDark} />
            )}
            {recurrenceDaysLabel && (
              <DetailRow icon="calendar-number-outline" label="Repeat Days" value={recurrenceDaysLabel} isDark={isDark} />
            )}
            {task.recurrenceEndDate && (
              <DetailRow icon="calendar-clear-outline" label="Recurrence Ends" value={formatDate(task.recurrenceEndDate)} isDark={isDark} />
            )}
          </View>
        </Card>

        {/* Description */}
        {task.description ? (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>Description</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{task.description}</Text>
          </Card>
        ) : null}

        {/* Assignees */}
        {task.assignees?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Assignees</Text>
              <TouchableOpacity
                onPress={() => setShowReminderModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#25D366' }}>Remind</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {task.assignees.map((a, i) => (
                <View key={a._id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={a.name || a.email || '?'} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{a.name || 'Unknown'}</Text>
                    {a.email ? <Text style={{ fontSize: 12, color: C.textSecondary }}>{a.email}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Subtasks */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
            Subtasks ({(task.subtasks || []).filter(s => s.status === 'done').length}/{(task.subtasks || []).length})
          </Text>
          <View style={{ gap: 10 }}>
            {(task.subtasks || []).map((sub) => (
              <TouchableOpacity
                key={sub._id}
                onPress={() => toggleSubtask(sub)}
                activeOpacity={0.6}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
              >
                <Ionicons
                  name={sub.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={sub.status === 'done' ? '#10B981' : C.textTertiary}
                />
                <Text style={{
                  fontSize: 14, flex: 1,
                  color: sub.status === 'done' ? C.textTertiary : C.text,
                  textDecorationLine: sub.status === 'done' ? 'line-through' : 'none',
                }}>
                  {sub.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <TextInput
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder="Add a subtask…"
              placeholderTextColor={C.textTertiary}
              onSubmitEditing={addSubtask}
              returnKeyType="done"
              style={{
                flex: 1,
                backgroundColor: C.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: C.text,
              }}
            />
            <TouchableOpacity
              onPress={addSubtask}
              disabled={subtaskBusy || !newSubtask.trim()}
              style={{
                paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                backgroundColor: newSubtask.trim() ? '#7C3AED' : C.surface,
                alignItems: 'center', justifyContent: 'center',
                minWidth: 64,
              }}
            >
              {subtaskBusy
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={{ color: newSubtask.trim() ? '#FFF' : C.textTertiary, fontWeight: '700', fontSize: 13 }}>Add</Text>
              }
            </TouchableOpacity>
          </View>
        </Card>

        {/* Categories */}
        {task.categories?.filter(c => c && (c.name || typeof c === 'string')).length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>Categories</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {task.categories.filter(c => c && (c.name || typeof c === 'string')).map((cat, i) => (
                <View key={cat._id || i} style={{
                  backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 13, color: '#6D28D9', fontWeight: '600' }}>
                    {cat.name || cat}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Delete */}
        <Button
          onPress={handleDelete}
          variant="danger"
          isDark={isDark}
          icon="trash-outline"
          style={{ marginTop: 8 }}
        >
          Delete Task
        </Button>
      </ScrollView>

      <AppModal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title="Send Reminder" isDark={isDark} size="sm">
        {!waTaskActive && (
          <View style={{
            padding: 12, borderRadius: 12, backgroundColor: C.warningLight,
            flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <Ionicons name="lock-closed" size={18} color={C.warning} />
            <Text style={{ fontSize: 12, color: C.text, flex: 1 }}>
              Task Reminder add-on required. Tap an assignee to see upgrade flow.
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>
          Pick an assignee to notify via WhatsApp.
        </Text>
        <View style={{ gap: 8 }}>
          {(task.assignees || []).map((a) => {
            const hasPhone = !!a.phoneNumber;
            return (
              <TouchableOpacity
                key={a._id}
                onPress={() => handleSendReminder(a)}
                disabled={remindingId === a._id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  opacity: remindingId === a._id ? 0.6 : 1,
                }}
                activeOpacity={0.8}
              >
                <Avatar name={a.name || a.email || '?'} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{a.name || 'Unknown'}</Text>
                  <Text style={{ fontSize: 12, color: hasPhone ? C.textSecondary : C.textTertiary }}>
                    {hasPhone ? a.phoneNumber : 'No phone on file'}
                  </Text>
                </View>
                {remindingId === a._id ? (
                  <Spinner size="sm" />
                ) : (
                  <Ionicons name="logo-whatsapp" size={20} color={hasPhone ? '#25D366' : C.textTertiary} />
                )}
              </TouchableOpacity>
            );
          })}
          {(task.assignees || []).length === 0 && (
            <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center', paddingVertical: 12 }}>
              No assignees to remind.
            </Text>
          )}
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
