import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { projectAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import {
  Card,
  Badge,
  SearchInput,
  EmptyState,
  Spinner,
  ScreenHeader,
  FilterChip,
} from '../../components/ui';
import { formatDate } from '../../utils/format';

const STATUS_COLORS = {
  planning: '#7C3AED',
  active: '#059669',
  on_hold: '#D97706',
  completed: '#2563EB',
  cancelled: '#6B7280',
};

function ProjectCard({ project, onPress, isDark }) {
  const C = getColors(isDark);
  const statusColor = STATUS_COLORS[project.status] || '#6B7280';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderLeftWidth: 3,
        borderLeftColor: statusColor,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
          {project.name}
        </Text>
        <Badge status={project.status || 'planning'} />
      </View>
      {project.description && (
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 10 }} numberOfLines={2}>
          {project.description}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {project.clientId?.name && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="person-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 12, color: C.textSecondary }}>{project.clientId.name}</Text>
          </View>
        )}
        {project.startDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="calendar-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 12, color: C.textSecondary }}>{formatDate(project.startDate)}</Text>
          </View>
        )}
        {project.members?.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 12, color: C.textSecondary }}>{project.members.length} members</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await projectAPI.getAll(params);
      const data = res.data?.data || res.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    return navigation.addListener('focus', () => fetchProjects());
  }, [navigation, fetchProjects]);

  const filtered = projects.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScreenHeader title="Projects" subtitle={`${projects.length} projects`} backButton onBack={() => navigation.goBack()} actionIcon="add" onAction={() => navigation.navigate('CreateProject')} isDark={isDark} />
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search projects..." isDark={isDark} style={{ marginBottom: 12 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { value: '', label: 'All' },
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
              ].map(f => (
                <FilterChip key={f.value} label={f.label} active={statusFilter === f.value} onPress={() => setStatusFilter(f.value)} isDark={isDark} />
              ))}
            </View>
          </ScrollView>
        </View>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState icon="folder-open-outline" title="No projects found" isDark={isDark} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <ProjectCard
                project={item}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: item._id })}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
