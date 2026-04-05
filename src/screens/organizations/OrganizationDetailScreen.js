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
import { organizationAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Badge, Spinner, ScreenHeader, Avatar } from '../../components/ui';

function InfoRow({ icon, label, value, isDark }) {
  const C = getColors(isDark);
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 }}>
      <View style={{
        width: 34, height: 34, borderRadius: 9,
        backgroundColor: C.surface,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={17} color={C.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: C.textTertiary, fontWeight: '500', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: C.text, fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

export default function OrganizationDetailScreen({ route, navigation }) {
  const orgId = route?.params?.orgId;
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [org, setOrg] = useState(route?.params?.org || null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(!route?.params?.org);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const [orgRes, membersRes] = await Promise.allSettled([
        organizationAPI.getById(orgId),
        organizationAPI.getMembers(orgId),
      ]);
      if (orgRes.status === 'fulfilled') {
        setOrg(orgRes.value.data?.data || orgRes.value.data);
      }
      if (membersRes.status === 'fulfilled') {
        const data = membersRes.value.data?.data || membersRes.value.data || [];
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, [orgId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!org) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ padding: 20 }}>
          <ScreenHeader title="Organization" backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>Organization not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const address = [
    org.address?.street,
    org.address?.city,
    org.address?.state,
    org.address?.zipCode,
  ].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Organization"
          backButton
          onBack={() => navigation.goBack()}
          actionIcon="create-outline"
          onAction={() => navigation.navigate('CreateOrganization', { org, edit: true })}
          isDark={isDark}
        />

        {/* Header Card */}
        <Card isDark={isDark} style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 24 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 18,
            backgroundColor: C.primaryLight,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Ionicons name="business" size={30} color={C.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center' }}>{org.name}</Text>
          {org.email && (
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>{org.email}</Text>
          )}
        </Card>

        {/* Details */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 }}>Details</Text>
          <InfoRow icon="call-outline" label="Phone" value={org.phone} isDark={isDark} />
          <InfoRow icon="globe-outline" label="Website" value={org.website} isDark={isDark} />
          <InfoRow icon="location-outline" label="Address" value={address} isDark={isDark} />
          <InfoRow icon="document-text-outline" label="CIN Number" value={org.cinNumber} isDark={isDark} />
          {org.taxPercentage !== undefined && org.taxPercentage !== null && (
            <InfoRow icon="calculator-outline" label="Tax Rate" value={`${org.taxPercentage}%`} isDark={isDark} />
          )}
        </Card>

        {/* Members */}
        <Card isDark={isDark} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 }}>
            Members ({members.length})
          </Text>
          {members.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={28} color={C.textTertiary} />
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 8 }}>No members yet</Text>
            </View>
          ) : (
            members.map((member, idx) => {
              const u = member.userId || member;
              return (
                <View
                  key={u._id || idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: idx < members.length - 1 ? 1 : 0,
                    borderBottomColor: C.borderLight,
                  }}
                >
                  <Avatar name={u.name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{u.name || 'Unknown'}</Text>
                    <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{u.email}</Text>
                  </View>
                  <Badge status={member.role || u.role || 'member'} />
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
