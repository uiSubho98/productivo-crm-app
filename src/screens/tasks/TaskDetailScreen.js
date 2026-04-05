import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, Avatar, ScreenHeader, Button } from '../../components/ui';
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

  const fetchTask = async () => {
    try {
      const res = await taskAPI.getById(taskId);
      setTask(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTask(); }, [taskId]);

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
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>Assignees</Text>
            <View style={{ gap: 10 }}>
              {task.assignees.map((a, i) => (
                <View key={a._id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={a.name || a.email || '?'} size="sm" />
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{a.name || 'Unknown'}</Text>
                    {a.email ? <Text style={{ fontSize: 12, color: C.textSecondary }}>{a.email}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Subtasks */}
        {task.subtasks?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
              Subtasks ({task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length})
            </Text>
            <View style={{ gap: 10 }}>
              {task.subtasks.map((sub, idx) => (
                <View key={sub._id || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons
                    name={sub.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={sub.status === 'done' ? '#10B981' : C.textTertiary}
                  />
                  <Text style={{
                    fontSize: 14, flex: 1,
                    color: sub.status === 'done' ? C.textTertiary : C.text,
                    textDecorationLine: sub.status === 'done' ? 'line-through' : 'none',
                  }}>
                    {sub.title}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

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
    </SafeAreaView>
  );
}
