import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI, projectAPI, categoryAPI, organizationAPI, userAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import { getColors } from '../../utils/colors';
import { Input, Button, Card, ScreenHeader, DatePicker } from '../../components/ui';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly_mon_fri', label: 'Mon – Fri' },
  { value: 'weekly', label: 'Custom Days' },
];

const WEEK_DAYS = [
  { value: 'sun', label: 'Su' },
  { value: 'mon', label: 'Mo' },
  { value: 'tue', label: 'Tu' },
  { value: 'wed', label: 'We' },
  { value: 'thu', label: 'Th' },
  { value: 'fri', label: 'Fr' },
  { value: 'sat', label: 'Sa' },
];

export default function CreateTaskScreen({ route, navigation }) {
  const editTask = route?.params?.task;
  const isEdit = !!editTask;
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const C = getColors(isDark);

  const [title, setTitle] = useState(editTask?.title || '');
  const [description, setDescription] = useState(editTask?.description || '');
  const [status, setStatus] = useState(editTask?.status || 'todo');
  const [priority, setPriority] = useState(editTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(editTask?.dueDate?.split('T')[0] || '');
  const [recurrence, setRecurrence] = useState(editTask?.recurrence || 'none');
  const [recurrenceDays, setRecurrenceDays] = useState(editTask?.recurrenceDays || []);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(editTask?.recurrenceEndDate?.split('T')[0] || '');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(editTask?.projectId?._id || editTask?.projectId || null);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(
    editTask?.categories?.map(c => c._id || c) || []
  );
  const [members, setMembers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState(
    editTask?.assignees?.map(a => a._id || a) || []
  );
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    setDataLoading(true);
    const orgId = user?.organizationId;
    Promise.allSettled([
      projectAPI.getAll().then(r => setProjects(r.data?.data || r.data || [])),
      categoryAPI.getAll().then(r => setCategories(r.data?.data || r.data || [])),
      orgId
        ? organizationAPI.getMembers(orgId).then(r => setMembers(r.data?.data || r.data || []))
        : userAPI.getAll({ limit: 200 }).then(r => {
            const d = r.data?.data?.users || r.data?.data || r.data || [];
            setMembers(Array.isArray(d) ? d : []);
          }),
    ]).finally(() => setDataLoading(false));
  }, []);

  const handlePickImage = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const newAttachments = result.assets.map(a => ({ uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, type: a.type || 'image/jpeg' }));
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch {
      Alert.alert('Not available', 'Image picker requires a development build. Please rebuild the app.');
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await categoryAPI.create({ name });
      const cat = res.data?.data || res.data;
      setCategories(prev => [...prev, cat]);
      setSelectedCategories(prev => [...prev, cat._id]);
      setNewCategoryName('');
      setShowCreateCategory(false);
    } catch {
      Alert.alert('Error', 'Failed to create category');
    }
    setCreatingCategory(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate ? `${dueDate}T12:00:00.000Z` : undefined,
        projectId: selectedProject || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined,
        recurrence,
        recurrenceDays: recurrence === 'weekly' ? recurrenceDays : [],
        recurrenceEndDate: recurrence !== 'none' && recurrenceEndDate ? recurrenceEndDate : undefined,
      };
      if (isEdit) {
        await taskAPI.update(editTask._id, payload);
      } else {
        const res = await taskAPI.create(payload);
        const taskId = res.data?.data?._id || res.data?._id;
        if (taskId && attachments.length > 0) {
          for (const att of attachments) {
            const fd = new FormData();
            fd.append('file', { uri: att.uri, name: att.name, type: att.type });
            await taskAPI.addAttachment(taskId, fd).catch(() => {});
          }
        }
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} task`);
    }
    setLoading(false);
  };

  const OptionRow = ({ label, value, options, onSelect }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                backgroundColor: value === opt.value ? C.primary : C.surface,
                borderWidth: 1, borderColor: value === opt.value ? C.primary : C.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.value ? '#FFF' : C.text }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const filteredMembers = members.filter(m =>
    !assigneeSearch.trim() ||
    (m.name || m.email || '').toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={isEdit ? 'Edit Task' : 'New Task'} backButton onBack={() => navigation.goBack()} isDark={isDark} />

          {dataLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: 14 }}>Loading...</Text>
            </View>
          ) : (
            <>
              <Input
                label="Title *"
                placeholder="Task title"
                value={title}
                onChangeText={setTitle}
                isDark={isDark}
                style={{ marginBottom: 16 }}
              />

              <Input
                label="Description"
                placeholder="Add details..."
                value={description}
                onChangeText={setDescription}
                isDark={isDark}
                multiline
                numberOfLines={4}
                style={{ marginBottom: 16 }}
                inputStyle={{ height: 100, textAlignVertical: 'top' }}
              />

              <OptionRow
                label="Status"
                value={status}
                options={[
                  { value: 'backlog', label: 'Backlog' },
                  { value: 'todo', label: 'To Do' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'in_review', label: 'In Review' },
                  { value: 'done', label: 'Done' },
                ]}
                onSelect={setStatus}
              />

              <OptionRow
                label="Priority"
                value={priority}
                options={[
                  { value: 'low', label: '↓ Low' },
                  { value: 'medium', label: '— Medium' },
                  { value: 'high', label: '↑ High' },
                  { value: 'urgent', label: '🔥 Urgent' },
                ]}
                onSelect={setPriority}
              />

              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
                isDark={isDark}
                style={{ marginBottom: 16 }}
              />

              {/* Recurrence */}
              <OptionRow
                label="Repeat"
                value={recurrence}
                options={RECURRENCE_OPTIONS}
                onSelect={setRecurrence}
              />

              {recurrence === 'weekly' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Select Days</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {WEEK_DAYS.map((d) => {
                      const selected = recurrenceDays.includes(d.value);
                      return (
                        <TouchableOpacity
                          key={d.value}
                          onPress={() => setRecurrenceDays(
                            selected ? recurrenceDays.filter(x => x !== d.value) : [...recurrenceDays, d.value]
                          )}
                          style={{
                            flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                            backgroundColor: selected ? C.primary : C.surface,
                            borderWidth: 1, borderColor: selected ? C.primary : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#FFF' : C.text }}>
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {recurrence !== 'none' && (
                <DatePicker
                  label="Repeat Until (optional)"
                  value={recurrenceEndDate}
                  onChange={setRecurrenceEndDate}
                  isDark={isDark}
                  style={{ marginBottom: 16 }}
                  placeholder="No end date"
                />
              )}

              {/* Project Selection */}
              {projects.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Project</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedProject(null)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                          backgroundColor: !selectedProject ? C.primary : C.surface,
                          borderWidth: 1, borderColor: !selectedProject ? C.primary : C.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: !selectedProject ? '#FFF' : C.text }}>None</Text>
                      </TouchableOpacity>
                      {projects.map((p) => (
                        <TouchableOpacity
                          key={p._id}
                          onPress={() => setSelectedProject(p._id)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                            backgroundColor: selectedProject === p._id ? C.primary : C.surface,
                            borderWidth: 1, borderColor: selectedProject === p._id ? C.primary : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selectedProject === p._id ? '#FFF' : C.text }}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Categories */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Categories</Text>
                {categories.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {categories.map((cat) => {
                      const selected = selectedCategories.includes(cat._id);
                      return (
                        <TouchableOpacity
                          key={cat._id}
                          onPress={() => setSelectedCategories(
                            selected
                              ? selectedCategories.filter(id => id !== cat._id)
                              : [...selectedCategories, cat._id]
                          )}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                            backgroundColor: selected ? '#7C3AED' : C.surface,
                            borderWidth: 1, borderColor: selected ? '#7C3AED' : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#FFF' : C.text }}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {showCreateCategory ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholderTextColor={C.placeholder}
                      style={{
                        flex: 1, fontSize: 14, color: C.text, backgroundColor: C.inputBg,
                        borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 9,
                      }}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={handleCreateCategory}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                        backgroundColor: '#7C3AED', opacity: creatingCategory || !newCategoryName.trim() ? 0.5 : 1,
                      }}
                    >
                      {creatingCategory
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Add</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowCreateCategory(false); setNewCategoryName(''); }}>
                      <Ionicons name="close" size={20} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowCreateCategory(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color='#7C3AED' />
                    <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>Create new category</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Assignees */}
              {members.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Assignees</Text>
                  {selectedAssignees.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {selectedAssignees.map(id => {
                        const m = members.find(mb => mb._id === id);
                        if (!m) return null;
                        return (
                          <View key={id} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
                            backgroundColor: C.primary + '20', borderWidth: 1, borderColor: C.primary,
                          }}>
                            <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
                              {m.name || m.email}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedAssignees(prev => prev.filter(a => a !== id))}>
                              <Ionicons name="close" size={14} color={C.primary} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowAssigneeModal(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color={C.textSecondary} />
                    <Text style={{ fontSize: 13, color: C.textSecondary }}>
                      {selectedAssignees.length > 0 ? 'Add more assignees' : 'Add assignees'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Attachments (create only) */}
              {!isEdit && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Screenshots / Attachments</Text>
                  {attachments.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {attachments.map((att, idx) => (
                          <View key={idx} style={{ position: 'relative' }}>
                            <Image
                              source={{ uri: att.uri }}
                              style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: C.surface }}
                            />
                            <TouchableOpacity
                              onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: 'absolute', top: -6, right: -6,
                                width: 20, height: 20, borderRadius: 10,
                                backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="close" size={12} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 8, paddingVertical: 12, borderRadius: 10,
                      borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
                    }}
                  >
                    <Ionicons name="image-outline" size={18} color={C.textSecondary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>Add Images</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Button onPress={handleCreate} loading={loading} size="lg" isDark={isDark}>
                {isEdit ? 'Update Task' : 'Create Task'}
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Assignee Picker Modal */}
      <Modal visible={showAssigneeModal} transparent animationType="slide" onRequestClose={() => setShowAssigneeModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowAssigneeModal(false)}
        >
          <Pressable
            style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 }}>Select Assignees</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12, gap: 8,
            }}>
              <Ionicons name="search" size={16} color={C.textTertiary} />
              <TextInput
                placeholder="Search members..."
                value={assigneeSearch}
                onChangeText={setAssigneeSearch}
                placeholderTextColor={C.placeholder}
                style={{ flex: 1, fontSize: 14, color: C.text, padding: 0 }}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredMembers.map(m => {
                const isSelected = selectedAssignees.includes(m._id);
                return (
                  <TouchableOpacity
                    key={m._id}
                    onPress={() => setSelectedAssignees(prev =>
                      isSelected ? prev.filter(id => id !== m._id) : [...prev, m._id]
                    )}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 4,
                      borderBottomWidth: 1, borderBottomColor: C.border,
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: C.primary + '30', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>
                        {(m.name || m.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{m.name || m.email}</Text>
                      {m.name && m.email && <Text style={{ fontSize: 12, color: C.textSecondary }}>{m.email}</Text>}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowAssigneeModal(false)}
              style={{
                marginTop: 16, paddingVertical: 14, borderRadius: 12,
                backgroundColor: C.primary, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Done ({selectedAssignees.length} selected)</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
