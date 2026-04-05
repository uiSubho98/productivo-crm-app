import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI, organizationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import {
  Card,
  Badge,
  SearchInput,
  TabSwitcher,
  FilterChip,
  EmptyState,
  Spinner,
  Avatar,
  ScreenHeader,
} from '../../components/ui';
import { formatDueDate, isOverdue } from '../../utils/format';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_META = {
  low: { icon: 'arrow-down', color: '#94A3B8' },
  medium: { icon: 'remove', color: '#F59E0B' },
  high: { icon: 'arrow-up', color: '#F97316' },
  urgent: { icon: 'flame', color: '#EF4444' },
};

function TaskCard({ task, onPress, isDark }) {
  const C = getColors(isDark);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const due = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
      activeOpacity={0.8}
    >
      <Ionicons name={pm.icon} size={18} color={pm.color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: task.status === 'done' ? C.textTertiary : C.text,
            textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <Badge status={task.status} />
          {task.projectId?.name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="folder-outline" size={11} color={C.textTertiary} />
              <Text style={{ fontSize: 11, color: C.textTertiary }}>{task.projectId.name}</Text>
            </View>
          )}
          {due && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="calendar-outline" size={11} color={overdue ? '#DC2626' : C.textTertiary} />
              <Text style={{ fontSize: 11, color: overdue ? '#DC2626' : C.textTertiary }}>{due}</Text>
            </View>
          )}
        </View>
      </View>
      {task.assignees?.length > 0 && (
        <View style={{ flexDirection: 'row' }}>
          {task.assignees.slice(0, 2).map((a, i) => (
            <Avatar key={a._id || i} name={a.name} size="xs" style={{ marginLeft: i > 0 ? -6 : 0, borderWidth: 1.5, borderColor: C.card }} />
          ))}
          {task.assignees.length > 2 && (
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: C.surface, marginLeft: -6,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: C.card,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: C.textSecondary }}>+{task.assignees.length - 2}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TasksScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const C = getColors(isDark);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [orgTab, setOrgTab] = useState('all');

  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    organizationAPI.get().then(res => {
      const data = res.data?.data || res.data || [];
      setOrganizations(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (orgTab !== 'all') params.organizationId = orgTab;
      const res = await taskAPI.getAll(params);
      const data = res.data?.data || res.data || [];
      setTasks(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search, statusFilter, priorityFilter, orgTab]);

  useEffect(() => {
    const t = setTimeout(fetchTasks, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchTasks]);

  useEffect(() => {
    return navigation.addListener('focus', () => fetchTasks());
  }, [navigation, fetchTasks]);

  const onRefresh = () => { setRefreshing(true); fetchTasks(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScreenHeader
            title="Tasks"
            subtitle={`${tasks.length} tasks`}
            actionIcon="add"
            onAction={() => navigation.navigate('CreateTask')}
            isDark={isDark}
          />

          {(isSuperAdmin || organizations.length > 1) && organizations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
                <FilterChip
                  label="All Orgs"
                  active={orgTab === 'all'}
                  onPress={() => setOrgTab('all')}
                  isDark={isDark}
                />
                {organizations.map((org) => (
                  <FilterChip
                    key={org._id}
                    label={org.name}
                    active={orgTab === org._id}
                    onPress={() => setOrgTab(org._id)}
                    isDark={isDark}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks..."
            isDark={isDark}
            style={{ marginBottom: 12 }}
          />

          {/* Status filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
              {STATUSES.map((s) => (
                <FilterChip
                  key={s.value}
                  label={s.label}
                  active={statusFilter === s.value}
                  onPress={() => setStatusFilter(s.value)}
                  isDark={isDark}
                />
              ))}
            </View>
          </ScrollView>

          {/* Priority filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
              {[
                { value: '', label: 'All Priority' },
                { value: 'urgent', label: '🔥 Urgent' },
                { value: 'high', label: '↑ High' },
                { value: 'medium', label: '— Medium' },
                { value: 'low', label: '↓ Low' },
              ].map((p) => (
                <FilterChip
                  key={p.value}
                  label={p.label}
                  active={priorityFilter === p.value}
                  onPress={() => setPriorityFilter(p.value)}
                  isDark={isDark}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {loading && tasks.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="checkbox-outline"
            title="No tasks yet"
            subtitle="Create your first task to get started"
            actionLabel="Create Task"
            onAction={() => navigation.navigate('CreateTask')}
            isDark={isDark}
          />
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item._id, title: item.title })}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
