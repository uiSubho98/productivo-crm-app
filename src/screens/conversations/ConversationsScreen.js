import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../../store/themeStore';
import useConversationStore from '../../store/conversationStore';
import { getColors } from '../../utils/colors';
import { EmptyState, Spinner, ScreenHeader, Avatar, SearchInput } from '../../components/ui';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';
import { formatDateTime } from '../../utils/format';

function ConversationItem({ conversation, onPress, isDark }) {
  const C = getColors(isDark);
  const unread = conversation.unreadCount > 0;
  const preview = conversation.lastMessagePreview
    || conversation.lastMessage?.content?.text
    || (conversation.lastMessage?.type ? `[${conversation.lastMessage.type}]` : 'No messages');
  const ts = conversation.lastMessageAt || conversation.lastMessage?.timestamp;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
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
            {ts ? formatDateTime(ts) : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: C.textSecondary, flex: 1 }} numberOfLines={1}>
            {preview}
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

function MessageBubble({ message, isDark }) {
  const C = getColors(isDark);
  const outbound = message.direction === 'outbound';
  const text = message.content?.text || (message.type ? `[${message.type}]` : '');
  return (
    <View style={{
      alignSelf: outbound ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      backgroundColor: outbound ? '#25D366' : C.surface,
      borderRadius: 16,
      borderBottomRightRadius: outbound ? 4 : 16,
      borderBottomLeftRadius: outbound ? 16 : 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    }}>
      <Text style={{ fontSize: 14, color: outbound ? '#FFF' : C.text, lineHeight: 19 }}>{text}</Text>
      <Text style={{ fontSize: 10, color: outbound ? 'rgba(255,255,255,0.7)' : C.textTertiary, marginTop: 3, textAlign: 'right' }}>
        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
      </Text>
    </View>
  );
}

export default function ConversationsScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);

  const {
    conversations, currentPhone, messages,
    isLoadingConversations, isLoadingMessages, isSending,
    fetchConversations, fetchMessages, markRead, sendMessage, clearMessages,
  } = useConversationStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [connected, setConnected] = useState(false);
  const listRef = useRef(null);
  const pollingRef = useRef(null);

  // Connect socket once on mount
  useEffect(() => {
    (async () => {
      const s = await connectSocket();
      if (s?.connected) setConnected(true);
      // Also watch connect/disconnect to update indicator
      const sock = getSocket();
      if (sock) {
        sock.on('connect', () => setConnected(true));
        sock.on('disconnect', () => setConnected(false));
      }
    })();
    return () => {
      // don't disconnect globally — other screens may reuse the socket.
      // disconnectSocket() is called from authStore.logout via reset callbacks if needed.
    };
  }, []);

  // Fallback polling for conversation list (slower when socket is up)
  useEffect(() => {
    fetchConversations();
    const interval = connected ? 15000 : 5000;
    pollingRef.current = setInterval(fetchConversations, interval);
    return () => clearInterval(pollingRef.current);
  }, [connected, fetchConversations]);

  // Poll messages for active conversation (socket handles inbound, polling catches outbound echoes)
  useEffect(() => {
    if (!currentPhone) return;
    const pollInterval = connected ? 8000 : 3000;
    const id = setInterval(() => fetchMessages(currentPhone), pollInterval);
    return () => clearInterval(id);
  }, [currentPhone, fetchMessages, connected]);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const openConversation = useCallback(async (phone) => {
    await fetchMessages(phone);
    markRead(phone);
  }, [fetchMessages, markRead]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !currentPhone) return;
    setMessageText('');
    await sendMessage(currentPhone, { type: 'text', message: text });
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = (c.clientName || c.phone || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // --- Chat thread view ---
  if (currentPhone) {
    const conv = conversations.find((c) => c.phone === currentPhone);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Thread header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 12, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: C.border,
            backgroundColor: C.card,
          }}>
            <TouchableOpacity onPress={clearMessages} style={{ padding: 6 }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Avatar name={conv?.clientName || currentPhone} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }} numberOfLines={1}>
                {conv?.clientName || currentPhone}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: connected ? '#10B981' : '#94A3B8',
                }} />
                <Text style={{ fontSize: 11, color: C.textTertiary }}>
                  {connected ? 'Live' : 'Polling'}
                </Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          {isLoadingMessages && messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m, i) => m._id || m.waMessageId || String(i)}
              contentContainerStyle={{ padding: 12, flexGrow: 1, justifyContent: 'flex-end' }}
              renderItem={({ item }) => <MessageBubble message={item} isDark={isDark} />}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Composer */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: 8,
            paddingHorizontal: 10, paddingVertical: 8,
            borderTopWidth: 1, borderTopColor: C.border,
            backgroundColor: C.card,
          }}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Message"
              placeholderTextColor={C.placeholder}
              multiline
              style={{
                flex: 1, fontSize: 15, color: C.text,
                backgroundColor: C.surface, borderRadius: 20,
                paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                maxHeight: 120, minHeight: 40,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: '#25D366',
                alignItems: 'center', justifyContent: 'center',
                opacity: !messageText.trim() || isSending ? 0.5 : 1,
              }}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Conversation list ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{
          padding: 16, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
          backgroundColor: C.card,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>WhatsApp</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: connected ? '#10B981' : '#94A3B8',
                }} />
                <Text style={{ fontSize: 12, color: C.textSecondary }}>
                  {connected ? 'Live' : 'Polling'} · {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search…" isDark={isDark} />
        </View>

        {isLoadingConversations && conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color="#25D366" />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations"
            subtitle="Inbound WhatsApp messages will appear here in real time."
            isDark={isDark}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.phone || item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchConversations(); setRefreshing(false); }} tintColor="#25D366" />}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                onPress={() => openConversation(item.phone)}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
