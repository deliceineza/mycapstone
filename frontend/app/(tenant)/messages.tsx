import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Send, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations, getConversationMessages, sendMessage, Message } from '@/services/messages';
import { MessageBubble } from '@/components/MessageBubble';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';

interface ConversationSummary {
  id: string;
  subject?: string;
  property?: { id: string; name: string; address: string };
  landlord?: { id: string; firstName: string; lastName: string; profileImage?: string };
  tenant?: { id: string; firstName: string; lastName: string; profileImage?: string };
  unreadCount?: number;
}

export default function TenantMessagesScreen() {
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
    const other = conversation.landlord || conversation.tenant;
    return other ? `${other.firstName} ${other.lastName}` : 'Chat';
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Manager Chat" subtitle="Chat with your property manager" />
      {!selectedConversation ? (
        <View style={styles.noTenant}>
          <MessageSquare size={40} color={colors.textMuted} />
          <Text style={styles.noTenantTitle}>No conversations found</Text>
          <Text style={styles.noTenantText}>Your property manager can start a chat from their dashboard.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListContent}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <MessageSquare size={32} color={colors.textMuted} />
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSub}>Send a message to your property manager</Text>
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
  noTenant: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noTenantTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  noTenantText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: spacing.md },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyChatText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  emptyChatSub: { fontSize: fontSize.sm, color: colors.textMuted },
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
