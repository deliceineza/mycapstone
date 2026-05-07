import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Send, User, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations, getConversationMessages, sendMessage, Message } from '@/services/messages';
import { MessageBubble } from '@/components/MessageBubble';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';

interface ConversationSummary {
  id: string;
  subject?: string;
  property?: { id: string; name: string; address: string };
  tenant?: { id: string; firstName: string; lastName: string; profileImage?: string };
  landlord?: { id: string; firstName: string; lastName: string; profileImage?: string };
  unreadCount?: number;
}

export default function LandlordMessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadConversations = useCallback(async () => {
    const data = await getConversations();
    setConversations(data);
    if (data.length > 0 && !selectedConversation) {
      setSelectedConversation(data[0]);
    }
  }, [selectedConversation]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return;
    const msgs = await getConversationMessages(selectedConversation.id);
    setMessages(msgs);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [selectedConversation]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSelectConversation = async (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await sendMessage(selectedConversation.id, input.trim());
      setInput('');
      await loadMessages();
      await loadConversations();
    } finally {
      setSending(false);
    }
  };

  const renderConversationTitle = (conversation: ConversationSummary) => {
    const other = conversation.tenant || conversation.landlord;
    return other ? `${other.firstName} ${other.lastName}` : 'Conversation';
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Messages" subtitle="Chat with tenants" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tenantTabs} contentContainerStyle={styles.tenantTabsContent}>
        {conversations.map(conv => (
          <TouchableOpacity
            key={conv.id}
            onPress={() => handleSelectConversation(conv)}
            style={[styles.tenantTab, selectedConversation?.id === conv.id && styles.tenantTabActive]}
          >
            <View style={styles.tenantAvatar}>
              <User size={14} color={selectedConversation?.id === conv.id ? colors.white : colors.textMuted} />
            </View>
            <Text style={[styles.tenantTabText, selectedConversation?.id === conv.id && styles.tenantTabTextActive]}>
              {renderConversationTitle(conv)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!selectedConversation ? (
        <View style={styles.noChat}>
          <MessageSquare size={40} color={colors.textMuted} />
          <Text style={styles.noChatTitle}>No conversations yet</Text>
          <Text style={styles.noChatText}>Start a chat with one of your tenants</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListContent}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
              </View>
            ) : (
              messages.map(m => (
                <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
              ))
            )}
          </ScrollView>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            >
              <Send size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  tenantTabs: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tenantTabsContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tenantTab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  tenantTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tenantAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  tenantTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  tenantTabTextActive: { color: colors.white, fontWeight: fontWeight.semibold },
  noChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noChatTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  noChatText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: spacing.md },
  emptyChat: { alignItems: 'center', padding: spacing.xxl },
  emptyChatText: { color: colors.textMuted, fontSize: fontSize.sm },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1, color: colors.text, fontSize: fontSize.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
