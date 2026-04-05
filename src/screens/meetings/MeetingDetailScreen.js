import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { meetingAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, Avatar, ScreenHeader, Button, AppModal } from '../../components/ui';
import { formatDateTime, formatDate } from '../../utils/format';

export default function MeetingDetailScreen({ route, navigation }) {
  const { meetingId } = route.params || {};
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneNotes, setDoneNotes] = useState('');
  const [doneLoading, setDoneLoading] = useState(false);

  const fetchMeeting = async () => {
    try {
      const res = await meetingAPI.getById(meetingId);
      setMeeting(res.data?.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchMeeting(); }, [meetingId]);

  const handleCancel = () => {
    Alert.alert('Cancel Meeting', 'Are you sure you want to cancel this meeting?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await meetingAPI.cancel(meetingId);
            fetchMeeting();
          } catch {
            Alert.alert('Error', 'Failed to cancel meeting');
          }
        },
      },
    ]);
  };

  const handleMarkDone = async () => {
    setDoneLoading(true);
    try {
      await meetingAPI.update(meetingId, { status: 'completed' });
      if (doneNotes.trim()) {
        await meetingAPI.addNotes(meetingId, { notes: doneNotes.trim() });
      }
      setShowDoneModal(false);
      setDoneNotes('');
      fetchMeeting();
    } catch {
      Alert.alert('Error', 'Failed to mark meeting as done');
    }
    setDoneLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!meeting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="Meeting" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>Meeting not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClient = meeting.meetingType === 'client';
  const isUpcoming = new Date(meeting.scheduledAt || meeting.date) > new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMeeting(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Meeting"
          backButton
          onBack={() => navigation.goBack()}
          actionIcon={meeting.status === 'scheduled' ? 'create-outline' : undefined}
          onAction={meeting.status === 'scheduled' ? () => navigation.navigate('CreateMeeting', { meeting }) : undefined}
          isDark={isDark}
        />

        {/* Header */}
        <View style={{
          backgroundColor: isClient ? '#FEF3C7' : '#EDE9FE',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          alignItems: 'center',
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: isClient ? '#FDE68A' : '#DDD6FE',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Ionicons
              name={isClient ? 'briefcase' : 'videocam'}
              size={28}
              color={isClient ? '#D97706' : '#7C3AED'}
            />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8 }}>
            {meeting.title}
          </Text>
          <Badge status={meeting.status || 'scheduled'} />
        </View>

        {/* Join Button */}
        {meeting.meetLink && isUpcoming && (
          <TouchableOpacity
            onPress={() => Linking.openURL(meeting.meetLink)}
            style={{
              backgroundColor: C.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Ionicons name="videocam" size={20} color="#FFF" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Join Meeting</Text>
          </TouchableOpacity>
        )}

        {/* Details */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 }}>Meeting Details</Text>
          <View style={{ gap: 14 }}>
            {[
              { label: 'Date & Time', value: formatDateTime(meeting.scheduledAt || meeting.date), icon: 'calendar-outline' },
              { label: 'Duration', value: meeting.duration ? `${meeting.duration} minutes` : 'Not set', icon: 'time-outline' },
              { label: 'Type', value: isClient ? 'Client Meeting' : 'Personal', icon: 'people-outline' },
              { label: 'Meet Link', value: meeting.meetLink || 'No link', icon: 'link-outline' },
            ].map(({ label, value, icon }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: C.surface,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={icon} size={17} color={C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '500' }}>{label}</Text>
                  <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Description */}
        {meeting.description && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>Description</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{meeting.description}</Text>
          </Card>
        )}

        {/* Attendees */}
        {meeting.attendees?.length > 0 && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
              Attendees ({meeting.attendees.length})
            </Text>
            <View style={{ gap: 10 }}>
              {meeting.attendees.map((a, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={a.name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{a.name}</Text>
                    {a.email && <Text style={{ fontSize: 12, color: C.textSecondary }}>{a.email}</Text>}
                  </View>
                  {a.type && (
                    <View style={{ backgroundColor: C.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: C.textSecondary, textTransform: 'capitalize' }}>{a.type}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Notes */}
        {meeting.notes && (
          <Card isDark={isDark} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>Notes</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{meeting.notes}</Text>
          </Card>
        )}

        {/* Actions */}
        {meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
          <View style={{ gap: 10 }}>
            <Button
              onPress={() => setShowDoneModal(true)}
              isDark={isDark}
              icon="checkmark-circle-outline"
            >
              Mark as Done
            </Button>
            <Button
              onPress={handleCancel}
              variant="danger"
              isDark={isDark}
              icon="close-circle-outline"
            >
              Cancel Meeting
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Mark as Done Modal */}
      <AppModal
        isOpen={showDoneModal}
        onClose={() => { setShowDoneModal(false); setDoneNotes(''); }}
        title="Mark Meeting as Done"
        isDark={isDark}
      >
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>
          Meeting notes are optional. Add a summary if needed.
        </Text>
        <TextInput
          placeholder="Meeting notes / summary (optional)..."
          value={doneNotes}
          onChangeText={setDoneNotes}
          placeholderTextColor={C.placeholder}
          multiline
          numberOfLines={4}
          style={{
            fontSize: 14, color: C.text, backgroundColor: C.inputBg,
            borderWidth: 1, borderColor: C.border, borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 10,
            height: 100, textAlignVertical: 'top',
            marginBottom: 16,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            variant="outline"
            onPress={() => { setShowDoneModal(false); setDoneNotes(''); }}
            isDark={isDark}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onPress={handleMarkDone}
            loading={doneLoading}
            isDark={isDark}
            style={{ flex: 1 }}
          >
            Confirm Done
          </Button>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
