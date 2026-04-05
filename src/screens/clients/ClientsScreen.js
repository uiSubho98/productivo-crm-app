import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors, PipelineColors } from '../../utils/colors';
import {
  Card,
  Badge,
  SearchInput,
  TabSwitcher,
  EmptyState,
  Spinner,
  Avatar,
  ScreenHeader,
  FilterChip,
} from '../../components/ui';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'quotation_sent', label: 'Quotation Sent' },
  { key: 'quotation_revised', label: 'Revised' },
  { key: 'mvp_shared', label: 'MVP Shared' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

function ClientCard({ client, onPress, isDark }) {
  const C = getColors(isDark);
  const stageColor = PipelineColors[client.pipelineStage || 'lead'];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        borderLeftWidth: 3,
        borderLeftColor: stageColor,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={client.name} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }} numberOfLines={1}>
            {client.name}
          </Text>
          {client.companyName && (
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
              {client.companyName}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Badge status={client.pipelineStage || 'lead'} />
            {client.email && (
              <Text style={{ fontSize: 12, color: C.textTertiary }} numberOfLines={1}>
                {client.email}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

function PipelineColumn({ stage, clients, onClientPress, isDark }) {
  const C = getColors(isDark);
  const stageColor = PipelineColors[stage.key];

  return (
    <View style={{
      width: 240,
      backgroundColor: C.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderTopWidth: 3,
      borderTopColor: stageColor,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: stageColor + '15',
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: stageColor }}>{stage.label}</Text>
        <View style={{
          backgroundColor: C.card,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>{clients.length}</Text>
        </View>
      </View>
      <View style={{ padding: 8, gap: 6 }}>
        {clients.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: C.textTertiary }}>No clients</Text>
          </View>
        ) : (
          clients.map((client) => (
            <TouchableOpacity
              key={client._id}
              onPress={() => onClientPress(client)}
              style={{
                backgroundColor: C.card,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: C.border,
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Avatar name={client.name} size="xs" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, flex: 1 }} numberOfLines={1}>
                  {client.name}
                </Text>
              </View>
              {client.companyName && (
                <Text style={{ fontSize: 11, color: C.textTertiary }} numberOfLines={1}>{client.companyName}</Text>
              )}
              {client.email && (
                <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }} numberOfLines={1}>{client.email}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

export default function ClientsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'list'
  const [stageFilter, setStageFilter] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientAPI.getAll();
      const data = res.data?.data || res.data || [];
      setClients(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) => {
    const matchesSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = !stageFilter || (c.pipelineStage || 'lead') === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getClientsByStage = (key) => filtered.filter(c => (c.pipelineStage || 'lead') === key);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ScreenHeader
            title="Clients"
            subtitle={`${clients.length} clients`}
            actionIcon="add"
            onAction={() => navigation.navigate('CreateClient')}
            isDark={isDark}
          />

          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search clients..."
            isDark={isDark}
            style={{ marginBottom: 12 }}
          />

          <TabSwitcher
            tabs={[
              { value: 'pipeline', label: 'Pipeline' },
              { value: 'list', label: 'List' },
            ]}
            activeTab={viewMode}
            onTabChange={setViewMode}
            isDark={isDark}
            style={{ marginBottom: 12 }}
          />

          {viewMode === 'list' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <FilterChip label="All" active={!stageFilter} onPress={() => setStageFilter('')} isDark={isDark} />
                {PIPELINE_STAGES.map(s => (
                  <FilterChip key={s.key} label={s.label} active={stageFilter === s.key} onPress={() => setStageFilter(s.key)} isDark={isDark} />
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color={C.primary} />
          </View>
        ) : clients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No clients yet"
            subtitle="Add your first client to get started"
            isDark={isDark}
          />
        ) : viewMode === 'pipeline' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12, paddingTop: 4 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClients(); }} tintColor={C.primary} />}
          >
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.key}
                stage={stage}
                clients={getClientsByStage(stage.key)}
                onClientPress={(client) => navigation.navigate('ClientDetail', { clientId: client._id })}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClients(); }} tintColor={C.primary} />}
            renderItem={({ item }) => (
              <ClientCard
                client={item}
                onPress={() => navigation.navigate('ClientDetail', { clientId: item._id })}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
