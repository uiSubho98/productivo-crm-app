import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { whatsappAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { EmptyState, Spinner, ScreenHeader, Avatar, SearchInput } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

function ConversationItem({ conversation, onPress, isDark }) {
  const C = getColors(isDark);
  const unread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
        backgroundColor: unread ? (isDark ? '#052E1B' : '#F0FDF4') : C.card,
      }}
      activeOpacity={0.8}
    >
      <View style={{ position: 'relative' }}>
        <Avatar name={conversation.clientName || conversation.phone} size="md" />
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: 6,
          backgroundColor: '#25D366',
          borderWidth: 2, borderColor: C.card,
        }} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: unread ? '700' : '600', color: C.text }} numberOfLines={1}>
            {conversation.clientName || conversation.phone}
          </Text>
          <Text style={{ fontSize: 11, color: C.textTertiary }}>
            {conversation.lastMessage?.timestamp ? formatDateTime(conversation.lastMessage.timestamp) : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: C.textSecondary, flex: 1 }} numberOfLines={1}>
            {conversation.lastMessage?.content?.text || conversation.lastMessage?.type || 'No messages'}
          </Text>
          {unread && (
            <View style={{
              backgroundColor: '#25D366',
              borderRadius: 10,
              minWidth: 20,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    try {
      const res = await whatsappAPI.getConversations();
      const data = res.data?.data || res.data || [];
      setConversations(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchConversations(); }, []);

  const filtered = conversations.filter(c =>
    !search ||
    (c.clientName || c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          padding: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.card,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>WhatsApp</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search conversations..." isDark={isDark} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color="#25D366" />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations"
            subtitle="WhatsApp messages from clients will appear here"
            isDark={isDark}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.phone || item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor="#25D366" />}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                onPress={() => {
                  // Mark as read
                  if (item.unreadCount > 0) {
                    whatsappAPI.markRead(item.phone).catch(() => {});
                  }
                  // Navigate to chat thread — for now show alert
                  Alert.alert(item.clientName || item.phone, 'Open conversation thread');
                }}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
