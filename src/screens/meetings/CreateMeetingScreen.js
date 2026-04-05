import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { meetingAPI, clientAPI, projectAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Input, Button, Card, ScreenHeader, DatePicker, TimePicker, PhoneInput } from '../../components/ui';

const DURATIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hrs' },
  { value: '120', label: '2 hours' },
];

const MEETING_TYPES = [
  { value: 'personal', label: 'Personal / Team' },
  { value: 'client', label: 'Client Meeting' },
];

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

export default function CreateMeetingScreen({ route, navigation }) {
  const editMeeting = route?.params?.meeting;
  const isEdit = !!editMeeting;
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [form, setForm] = useState({
    title: editMeeting?.title || '',
    description: editMeeting?.description || '',
    scheduledAt: editMeeting?.scheduledAt?.split('T')[0] || '',
    time: editMeeting?.scheduledAt
      ? new Date(editMeeting.scheduledAt).toTimeString().slice(0, 5)
      : '',
    duration: editMeeting?.duration ? String(editMeeting.duration) : '30',
    meetingType: editMeeting?.meetingType || 'personal',
    clientId: editMeeting?.clientId?._id || editMeeting?.clientId || '',
    projectId: editMeeting?.projectId?._id || editMeeting?.projectId || '',
    recurrence: editMeeting?.recurrence || 'none',
    recurrenceDays: editMeeting?.recurrenceDays || [],
    recurrenceEndDate: editMeeting?.recurrenceEndDate?.split('T')[0] || '',
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Attendees state
  const [attendees, setAttendees] = useState(
    editMeeting?.attendees || []
  );
  const [newAttendee, setNewAttendee] = useState({ email: '', name: '', whatsapp: '', type: 'attendee' });

  useEffect(() => {
    setDataLoading(true);
    Promise.allSettled([
      clientAPI.getAll({ limit: 100 }).then(r => {
        const d = r.data?.data || r.data || [];
        setClients(Array.isArray(d) ? d : []);
      }),
      projectAPI.getAll({ limit: 100 }).then(r => {
        const d = r.data?.data || r.data || [];
        setProjects(Array.isArray(d) ? d : []);
      }),
    ]).finally(() => setDataLoading(false));
  }, []);

  // Auto-add client to attendees when client meeting type + client selected
  useEffect(() => {
    if (form.meetingType === 'client' && form.clientId) {
      const client = clients.find(c => c._id === form.clientId);
      if (client && client.email) {
        const alreadyAdded = attendees.some(
          a => a.email?.toLowerCase() === client.email?.toLowerCase() && a.type === 'client'
        );
        if (!alreadyAdded) {
          setAttendees(prev => [
            ...prev.filter(a => a.type !== 'client'),
            {
              email: client.email,
              name: client.name,
              whatsapp: client.whatsappNumber || '',
              type: 'client',
            },
          ]);
        }
      }
    }
  }, [form.clientId, form.meetingType, clients]);

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAddAttendee = () => {
    if (!newAttendee.email.trim()) return;
    setAttendees(prev => [...prev, {
      ...newAttendee,
      whatsapp: newAttendee.whatsapp ? `+91${newAttendee.whatsapp}` : '',
    }]);
    setNewAttendee({ email: '', name: '', whatsapp: '', type: 'attendee' });
  };

  const handleRemoveAttendee = (index) => {
    setAttendees(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!form.scheduledAt) { Alert.alert('Error', 'Date is required'); return; }
    if (!form.time) { Alert.alert('Error', 'Time is required'); return; }

    setLoading(true);
    const scheduledAt = new Date(`${form.scheduledAt}T${form.time}:00`).toISOString();

    // Auto-flush pending attendee if email is filled
    let finalAttendees = [...attendees];
    if (newAttendee.email.trim()) {
      finalAttendees = [...finalAttendees, { ...newAttendee }];
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      scheduledAt,
      duration: parseInt(form.duration) || 30,
      meetingType: form.meetingType,
      clientId: form.meetingType === 'client' ? form.clientId || undefined : undefined,
      projectId: form.projectId || undefined,
      attendees: finalAttendees,
      recurrence: form.recurrence,
      recurrenceDays: form.recurrence === 'weekly' ? form.recurrenceDays : [],
      recurrenceEndDate: form.recurrence !== 'none' && form.recurrenceEndDate ? form.recurrenceEndDate : undefined,
    };
    try {
      if (isEdit) {
        await meetingAPI.update(editMeeting._id, payload);
        Alert.alert('Success', 'Meeting updated');
        navigation.goBack();
      } else {
        await meetingAPI.create(payload);
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save meeting');
    }
    setLoading(false);
  };

  const ChipRow = ({ label, value, options, onSelect }) => (
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

  const SectionLabel = ({ title }) => (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: C.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: 20, marginBottom: 10, paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );

  const selectedClientObj = clients.find(c => c._id === form.clientId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={isEdit ? 'Edit Meeting' : 'New Meeting'}
            backButton onBack={() => navigation.goBack()} isDark={isDark}
          />

          {dataLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: 14 }}>Loading...</Text>
            </View>
          ) : (
            <>
              {/* Meeting Type */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Meeting Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {MEETING_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => {
                        set('meetingType')(type.value);
                        if (type.value === 'personal') {
                          set('clientId')('');
                          setAttendees(prev => prev.filter(a => a.type !== 'client'));
                        }
                      }}
                      style={{
                        flex: 1, paddingVertical: 12, borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: form.meetingType === type.value ? C.primary : C.border,
                        backgroundColor: form.meetingType === type.value ? C.primary + '15' : C.surface,
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name={type.value === 'personal' ? 'people-outline' : 'briefcase-outline'}
                        size={16}
                        color={form.meetingType === type.value ? C.primary : C.textSecondary}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={{
                        fontSize: 13, fontWeight: '600',
                        color: form.meetingType === type.value ? C.primary : C.text,
                      }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Title *"
                icon="calendar-outline"
                placeholder="Meeting title"
                value={form.title}
                onChangeText={set('title')}
                isDark={isDark}
                style={{ marginBottom: 14 }}
              />

              <Input
                label="Description / Agenda"
                placeholder="What is this meeting about?"
                value={form.description}
                onChangeText={set('description')}
                multiline
                numberOfLines={3}
                isDark={isDark}
                style={{ marginBottom: 14 }}
                inputStyle={{ height: 80, textAlignVertical: 'top' }}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <DatePicker
                    label="Date *"
                    value={form.scheduledAt}
                    onChange={set('scheduledAt')}
                    isDark={isDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TimePicker
                    label="Time *"
                    value={form.time}
                    onChange={set('time')}
                    isDark={isDark}
                  />
                </View>
              </View>

              <ChipRow label="Duration" value={form.duration} options={DURATIONS} onSelect={set('duration')} />

              {/* Recurrence */}
              <ChipRow label="Repeat" value={form.recurrence} options={RECURRENCE_OPTIONS} onSelect={set('recurrence')} />

              {/* Custom day picker for weekly recurrence */}
              {form.recurrence === 'weekly' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 8 }}>Select Days</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {WEEK_DAYS.map((d) => {
                      const selected = form.recurrenceDays.includes(d.value);
                      return (
                        <TouchableOpacity
                          key={d.value}
                          onPress={() => {
                            const next = selected
                              ? form.recurrenceDays.filter(x => x !== d.value)
                              : [...form.recurrenceDays, d.value];
                            set('recurrenceDays')(next);
                          }}
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

              {/* End date for recurring meetings */}
              {form.recurrence !== 'none' && (
                <DatePicker
                  label="Repeat Until (optional)"
                  value={form.recurrenceEndDate}
                  onChange={set('recurrenceEndDate')}
                  isDark={isDark}
                  style={{ marginBottom: 14 }}
                  placeholder="No end date"
                />
              )}

              {/* Google Meet auto-generation notice */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 12, borderRadius: 12, backgroundColor: C.primary + '15',
                marginBottom: 16,
              }}>
                <Ionicons name="videocam-outline" size={18} color={C.primary} />
                <Text style={{ fontSize: 13, color: C.primary, flex: 1 }}>
                  Google Meet link will be auto-generated
                </Text>
              </View>

              {/* Client selection (for client meetings) */}
              {form.meetingType === 'client' && clients.length > 0 && (
                <>
                  <SectionLabel title="Client *" />
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
                    borderRadius: 10, paddingHorizontal: 12, marginBottom: 10,
                  }}>
                    <Ionicons name="search-outline" size={16} color={C.textTertiary} />
                    <TextInput
                      placeholder="Search clients..."
                      placeholderTextColor={C.placeholder}
                      value={clientSearch}
                      onChangeText={setClientSearch}
                      style={{ flex: 1, fontSize: 14, color: C.text, paddingVertical: 10 }}
                    />
                    {clientSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearch('')}>
                        <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).map((c) => (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => set('clientId')(c._id)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                            backgroundColor: form.clientId === c._id ? C.primary : C.surface,
                            borderWidth: 1, borderColor: form.clientId === c._id ? C.primary : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: form.clientId === c._id ? '#FFF' : C.text }}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Client auto-added notice */}
                  {selectedClientObj && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      padding: 12, borderRadius: 12, backgroundColor: '#ECFDF5',
                      marginBottom: 16,
                    }}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                      <Text style={{ fontSize: 13, color: '#065F46', flex: 1 }}>
                        {selectedClientObj.name} ({selectedClientObj.email}) will receive email
                        {selectedClientObj.whatsappNumber ? ' + WhatsApp' : ''} notification
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Project selection */}
              {projects.length > 0 && (
                <>
                  <SectionLabel title={form.meetingType === 'client' ? 'Project (optional)' : 'Related Project (optional)'} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => set('projectId')('')}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                          backgroundColor: !form.projectId ? C.primary : C.surface,
                          borderWidth: 1, borderColor: !form.projectId ? C.primary : C.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: !form.projectId ? '#FFF' : C.text }}>None</Text>
                      </TouchableOpacity>
                      {projects.map((p) => (
                        <TouchableOpacity
                          key={p._id}
                          onPress={() => set('projectId')(p._id)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                            backgroundColor: form.projectId === p._id ? C.primary : C.surface,
                            borderWidth: 1, borderColor: form.projectId === p._id ? C.primary : C.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: form.projectId === p._id ? '#FFF' : C.text }}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Attendees */}
              <SectionLabel title="Attendees" />
              <Text style={{ fontSize: 12, color: C.textTertiary, marginBottom: 10, paddingHorizontal: 4 }}>
                You are automatically added as the organizer. Add other attendees below.
              </Text>

              {attendees.length > 0 && (
                <View style={{ marginBottom: 12, gap: 8 }}>
                  {attendees.map((attendee, index) => (
                    <View key={index} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12,
                      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                    }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: C.primary + '25', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="person-outline" size={16} color={C.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>
                          {attendee.name || attendee.email}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.textSecondary }} numberOfLines={1}>
                          {attendee.email}
                          {attendee.whatsapp ? ` • WA: ${attendee.whatsapp}` : ''}
                        </Text>
                      </View>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                        backgroundColor: C.border,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary, textTransform: 'capitalize' }}>
                          {attendee.type}
                        </Text>
                      </View>
                      {attendee.type !== 'client' && (
                        <TouchableOpacity onPress={() => handleRemoveAttendee(index)}>
                          <Ionicons name="close" size={18} color={C.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Add attendee form */}
              <Card isDark={isDark} style={{ borderStyle: 'dashed', marginBottom: 8 }}>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        placeholder="Email *"
                        value={newAttendee.email}
                        onChangeText={(v) => setNewAttendee(prev => ({ ...prev, email: v }))}
                        placeholderTextColor={C.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={{
                          fontSize: 14, color: C.text, backgroundColor: C.inputBg,
                          borderWidth: 1, borderColor: C.border, borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 10,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        placeholder="Name"
                        value={newAttendee.name}
                        onChangeText={(v) => setNewAttendee(prev => ({ ...prev, name: v }))}
                        placeholderTextColor={C.placeholder}
                        style={{
                          fontSize: 14, color: C.text, backgroundColor: C.inputBg,
                          borderWidth: 1, borderColor: C.border, borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 10,
                        }}
                      />
                    </View>
                  </View>
                  <PhoneInput
                    label={null}
                    value={newAttendee.whatsapp}
                    onChange={(v) => setNewAttendee(prev => ({ ...prev, whatsapp: v }))}
                    isDark={isDark}
                  />
                  <TouchableOpacity
                    onPress={handleAddAttendee}
                    disabled={!newAttendee.email.trim()}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 8, paddingVertical: 10, borderRadius: 10,
                      borderWidth: 1.5, borderColor: C.primary,
                      opacity: !newAttendee.email.trim() ? 0.4 : 1,
                    }}
                  >
                    <Ionicons name="person-add-outline" size={16} color={C.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>Add Attendee</Text>
                  </TouchableOpacity>
                </View>
              </Card>

              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 24, paddingHorizontal: 4 }}>
                All attendees receive an email invite. Those with a WhatsApp number also get a WhatsApp message.
              </Text>

              <Button onPress={handleSubmit} loading={loading} size="lg" isDark={isDark} style={{ marginTop: 8 }}>
                {isEdit ? 'Update Meeting' : 'Schedule Meeting'}
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
