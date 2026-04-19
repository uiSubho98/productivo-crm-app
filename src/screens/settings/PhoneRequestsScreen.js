import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Spinner, ScreenHeader, Avatar, Button, EmptyState } from '../../components/ui';

export default function PhoneRequestsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await authAPI.listPhoneRequests();
      const data = res.data?.data || res.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load requests');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = (id, action) => {
    Alert.alert(
      action === 'approve' ? 'Approve request?' : 'Reject request?',
      action === 'approve'
        ? 'User will get a 24-hour window to update their phone.'
        : 'User will need to submit a new request to try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setReviewingId(id);
            try {
              if (action === 'approve') await authAPI.approvePhoneRequest(id, '');
              else await authAPI.rejectPhoneRequest(id, '');
              setRequests((list) => list.filter((r) => r._id !== id));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || `Failed to ${action}`);
            }
            setReviewingId(null);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Phone Requests"
          subtitle={`${requests.length} pending`}
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
        />

        <View style={{
          backgroundColor: C.primaryLight, borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: C.primary + '30', marginBottom: 16,
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        }}>
          <Ionicons name="information-circle-outline" size={18} color={C.primary} />
          <Text style={{ fontSize: 12, color: C.text, flex: 1, lineHeight: 18 }}>
            Approved users get a 24-hour window to update their phone number.
          </Text>
        </View>

        {requests.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="All caught up"
            subtitle="No pending phone change requests."
            isDark={isDark}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {requests.map((r) => {
              const reviewing = reviewingId === r._id;
              const otherReviewing = !!reviewingId && reviewingId !== r._id;
              return (
                <Card key={r._id} isDark={isDark}>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                    <Avatar name={r.userId?.name || r.userId?.email} size="md" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }} numberOfLines={1}>
                        {r.userId?.name || 'Unknown'}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>
                        {r.userId?.email}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: C.surface }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textSecondary, textTransform: 'capitalize' }}>
                            {r.userId?.role || 'user'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ backgroundColor: C.surface, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>
                      Current phone
                    </Text>
                    <Text style={{ fontSize: 14, color: C.text, fontVariant: ['tabular-nums'] }}>
                      {r.currentPhone || '— not set —'}
                    </Text>
                  </View>

                  {r.reason ? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>
                        Reason
                      </Text>
                      <Text style={{ fontSize: 13, color: C.textSecondary, fontStyle: 'italic' }}>
                        "{r.reason}"
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => review(r._id, 'reject')}
                      loading={reviewing}
                      disabled={otherReviewing}
                      isDark={isDark}
                      style={{ flex: 1 }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onPress={() => review(r._id, 'approve')}
                      loading={reviewing}
                      disabled={otherReviewing}
                      isDark={isDark}
                      style={{ flex: 1 }}
                    >
                      Approve
                    </Button>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
