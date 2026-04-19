import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { projectAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, Avatar, ScreenHeader, Button } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params || {};
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProject = async () => {
    try {
      const res = await projectAPI.getById(projectId);
      setProject(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Project', 'Delete this project? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await projectAPI.delete(projectId);
          navigation.goBack();
        } catch { Alert.alert('Error', 'Failed to delete project'); }
      }},
    ]);
  };

  useEffect(() => { fetchProject(); }, [projectId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!project) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProject(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Project"
          backButton
          onBack={() => navigation.goBack()}
          actionIcon="create-outline"
          onAction={() => navigation.navigate('CreateProject', { project })}
          isDark={isDark}
        />
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 10 }}>{project.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Badge status={project.status || 'planning'} />
        </View>
        {project.description && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{project.description}</Text>
          </Card>
        )}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Details</Text>
          <View style={{ gap: 12 }}>
            {[
              { label: 'Client', value: project.clientId?.name, icon: 'person-outline' },
              { label: 'Start Date', value: project.startDate ? formatDate(project.startDate) : null, icon: 'calendar-outline' },
              { label: 'End Date', value: project.endDate ? formatDate(project.endDate) : null, icon: 'flag-outline' },
              { label: 'Domain', value: project.domain, icon: 'globe-outline' },
            ].filter(d => d.value).map(({ label, value, icon }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={icon} size={16} color={C.textSecondary} />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>{label}</Text>
                  <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
        {/* Task Progress */}
        {(() => {
          const total = project.totalTasks ?? 0;
          if (total === 0) return null;
          const doneCount = project.doneTasks ?? 0;
          const inProgressCount = project.inProgressTasks ?? 0;
          const inReviewCount = project.inReviewTasks ?? 0;
          const todoCount = project.todoTasks ?? 0;
          const progress = project.progress ?? 0;
          return (
            <Card isDark={isDark} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Progress</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>{progress}%</Text>
              </View>
              {/* Single bar: green fill = done%, gray track = remainder */}
              <View style={{ height: 10, borderRadius: 6, backgroundColor: C.border, overflow: 'hidden', marginBottom: 10 }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#10B981', borderRadius: 6 }} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {doneCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 12, color: '#10B981' }}>{doneCount} done</Text>
                  </View>
                )}
                {inReviewCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6' }} />
                    <Text style={{ fontSize: 12, color: '#8B5CF6' }}>{inReviewCount} in review</Text>
                  </View>
                )}
                {inProgressCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                    <Text style={{ fontSize: 12, color: '#3B82F6' }}>{inProgressCount} in progress</Text>
                  </View>
                )}
                {todoCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.textTertiary }} />
                    <Text style={{ fontSize: 12, color: C.textTertiary }}>{todoCount} todo</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        })()}

        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
              Team ({project.members?.length || 0})
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProjectMembers', { projectId: project._id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="people-outline" size={14} color={C.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Manage</Text>
            </TouchableOpacity>
          </View>
          {project.members?.length > 0 ? (
            <View style={{ gap: 10 }}>
              {project.members.map((m, idx) => (
                <View key={m._id || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={m.name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{m.name}</Text>
                    {m.email && <Text style={{ fontSize: 12, color: C.textSecondary }}>{m.email}</Text>}
                  </View>
                  {m.role && (
                    <View style={{ backgroundColor: C.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: C.textSecondary, textTransform: 'capitalize' }}>{m.role}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: C.textSecondary, paddingVertical: 6 }}>
              No members yet. Tap Manage to add teammates.
            </Text>
          )}
        </Card>

        <Button onPress={handleDelete} variant="danger" isDark={isDark} icon="trash-outline" style={{ marginTop: 8 }}>
          Delete Project
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
