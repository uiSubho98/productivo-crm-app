import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';

const STATUS_COLORS = {
  new:       { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  contacted: { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
  converted: { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
  closed:    { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

const STATUS_COLORS_DARK = {
  new:       { bg: '#1E3A5F', text: '#93C5FD', border: '#1E40AF' },
  contacted: { bg: '#1C1000', text: '#FCD34D', border: '#92400E' },
  converted: { bg: '#052E16', text: '#6EE7B7', border: '#065F46' },
  closed:    { bg: '#1F2937', text: '#9CA3AF', border: '#374151' },
};

function StatusBadge({ status, isDark }) {
  const palette = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  const colors = palette[status] || palette.closed;
  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : 'Unknown';
  return (
    <View style={{
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}

function EnquiryCard({ enquiry, isDark }) {
  const C = getColors(isDark);
  const [expanded, setExpanded] = useState(false);

  const formattedDate = enquiry.createdAt
    ? new Date(enquiry.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
      style={{
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {/* Top row: name + date */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, flex: 1 }} numberOfLines={1}>
          {enquiry.fullName || 'Unknown'}
        </Text>
        {formattedDate && (
          <Text style={{ fontSize: 12, color: C.textTertiary, flexShrink: 0 }}>
            {formattedDate}
          </Text>
        )}
      </View>

      {/* Contact info */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
        {enquiry.email ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="mail-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 13, color: C.textSecondary }} numberOfLines={1}>
              {enquiry.email}
            </Text>
          </View>
        ) : null}
        {enquiry.phone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="call-outline" size={13} color={C.textTertiary} />
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              {enquiry.phone}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Status badge */}
      <View style={{ marginTop: 8 }}>
        <StatusBadge status={enquiry.status} isDark={isDark} />
      </View>

      {/* Description — truncated or full */}
      {enquiry.description ? (
        <Text
          style={{ fontSize: 13, color: C.textSecondary, marginTop: 10, lineHeight: 19 }}
          numberOfLines={expanded ? undefined : 2}
        >
          {enquiry.description}
        </Text>
      ) : null}

      {/* Notes — only when expanded */}
      {expanded && enquiry.notes ? (
        <View style={{
          marginTop: 12,
          backgroundColor: C.surface,
          borderRadius: 10,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: C.primary,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Notes
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
            {enquiry.notes}
          </Text>
        </View>
      ) : null}

      {/* Expand / collapse chevron */}
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={C.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function EnquiriesScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchEnquiries = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/enquiries');
      const data = res.data?.data || res.data || [];
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load enquiries. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEnquiries(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEnquiries();
  }, [fetchEnquiries]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>Enquiries</Text>
          {!loading && (
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>
              {enquiries.length} {enquiries.length === 1 ? 'enquiry' : 'enquiries'}
            </Text>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          <Ionicons name="alert-circle-outline" size={48} color={C.textTertiary} />
          <Text style={{ fontSize: 15, color: C.textSecondary, textAlign: 'center', marginTop: 12 }}>
            {error}
          </Text>
        </ScrollView>
      ) : enquiries.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            backgroundColor: '#6366F1' + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="mail-outline" size={34} color="#6366F1" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>
            No enquiries yet
          </Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}>
            New enquiries will appear here once submitted
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          {enquiries.map((item) => (
            <EnquiryCard
              key={item._id || item.id || Math.random().toString()}
              enquiry={item}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
