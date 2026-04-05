import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { organizationAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, EmptyState, Spinner, ScreenHeader, Avatar, SearchInput } from '../../components/ui';

export default function OrganizationsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchOrgs = async () => {
    try {
      const res = await organizationAPI.get();
      const data = res.data?.data || res.data || [];
      setOrgs(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchOrgs(); }, []);

  const filtered = orgs.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <ScreenHeader
            title="Organizations"
            subtitle={`${orgs.length} organizations`}
            backButton
            onBack={() => navigation.goBack()}
            actionIcon="add"
            onAction={() => navigation.navigate('CreateOrganization')}
            isDark={isDark}
          />
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search organizations..."
            isDark={isDark}
            style={{ marginBottom: 12 }}
          />
        </View>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title={orgs.length === 0 ? 'No organizations' : 'No results'}
            subtitle={orgs.length === 0 ? 'Create your first organization' : undefined}
            actionLabel={orgs.length === 0 ? 'Create Organization' : undefined}
            onAction={orgs.length === 0 ? () => navigation.navigate('CreateOrganization') : undefined}
            isDark={isDark}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrgs(); }} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('OrganizationDetail', { orgId: item._id, org: item })}
                style={{
                  backgroundColor: C.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: C.primaryLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="business" size={24} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{item.name}</Text>
                  {item.address?.city && (
                    <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
                      {[item.address.city, item.address.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {item.phone && (
                    <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>{item.phone}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
