import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, EmptyState, Spinner, ScreenHeader, Avatar, SearchInput, Badge } from '../../components/ui';

export default function UsersScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getAll();
      const data = res.data?.data?.users || res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScreenHeader title="Users" subtitle={`${users.length} users`} backButton onBack={() => navigation.goBack()} isDark={isDark} />
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search users..." isDark={isDark} style={{ marginBottom: 12 }} />
        </View>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState icon="people-outline" title="No users found" isDark={isDark} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <View style={{
                backgroundColor: C.card,
                borderRadius: 14,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: C.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <Avatar name={item.name} size="md" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{item.email}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge status={item.role || 'employee'} />
                  {!item.isActive && (
                    <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Inactive</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
