import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { meetingAPI } from '../../services/api';
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
import { formatDateTime, formatDate } from '../../utils/format';

function MeetingCard({ meeting, onPress, isDark }) {
  const C = getColors(isDark);
  const isClient = meeting.meetingType === 'client';
  const isPast = new Date(meeting.scheduledAt || meeting.date) < new Date();
  const isCancelled = meeting.status === 'cancelled';

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
        opacity: isCancelled ? 0.6 : 1,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: isClient ? '#FEF3C7' : '#EDE9FE',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons
            name={isClient ? 'briefcase-outline' : 'videocam-outline'}
            size={22}
            color={isClient ? '#D97706' : '#7C3AED'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 }} numberOfLines={1}>
            {meeting.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="calendar-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 13, color: isPast ? C.textTertiary : C.textSecondary }}>
              {formatDateTime(meeting.scheduledAt || meeting.date)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Badge status={meeting.status || 'scheduled'} />
            {meeting.duration && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="time-outline" size={12} color={C.textTertiary} />
                <Text style={{ fontSize: 12, color: C.textTertiary }}>{meeting.duration} min</Text>
              </View>
            )}
          </View>
        </View>
        {meeting.meetLink && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); Linking.openURL(meeting.meetLink); }}
            style={{
              backgroundColor: C.primaryLight,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 9,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Join</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MeetingsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'client' | 'personal'

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await meetingAPI.getAll({});
      const data = res.data?.data || res.data || [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    return navigation.addListener('focus', () => fetchMeetings());
  }, [navigation, fetchMeetings]);

  const now = new Date();

  const filtered = meetings.filter((m) => {
    const matchesSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || m.meetingType === typeFilter;
    const date = new Date(m.scheduledAt || m.date);
    const isUpcoming = date >= now && m.status !== 'cancelled';
    const matchesTab = tab === 'upcoming' ? isUpcoming : !isUpcoming;
    return matchesSearch && matchesType && matchesTab;
  }).sort((a, b) => {
    const da = new Date(a.scheduledAt || a.date);
    const db = new Date(b.scheduledAt || b.date);
    return tab === 'upcoming' ? da - db : db - da;
  });

  const TABS = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];

  const TYPE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'client', label: 'Client' },
    { key: 'personal', label: 'Personal' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Fixed header + tabs + filters */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 }}>
        <ScreenHeader
          title="Meetings"
          subtitle={`${meetings.length} meetings`}
          actionIcon="add"
          onAction={() => navigation.navigate('CreateMeeting')}
          isDark={isDark}
        />

        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search meetings..."
          isDark={isDark}
          style={{ marginBottom: 14 }}
        />

        {/* Upcoming / Past tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: C.surface,
          borderRadius: 12,
          padding: 3,
          marginBottom: 12,
        }}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: tab === key ? C.card : 'transparent',
                shadowColor: tab === key ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: tab === key ? 2 : 0,
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: tab === key ? '700' : '500',
                color: tab === key ? C.primary : C.textSecondary,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* All / Client / Personal */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {TYPE_FILTERS.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={typeFilter === key}
              onPress={() => setTypeFilter(key)}
              isDark={isDark}
            />
          ))}
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMeetings(); }}
            tintColor={C.primary}
          />
        }
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={`No ${tab} meetings`}
            isDark={isDark}
          />
        ) : (
          filtered.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              onPress={() => navigation.navigate('MeetingDetail', { meetingId: m._id })}
              isDark={isDark}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
