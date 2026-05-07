import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Send, Bot, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTenantByProfileId } from '@/services/tenants';
import { getPaymentsByTenant } from '@/services/payments';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Tenant, Payment } from '@/types/database';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'When is my rent due?',
  'Show my payment history',
  'What is my rent amount?',
  'Contact my manager',
  'Am I at risk?',
];

function processQuery(query: string, tenant: Tenant | null, payments: Payment[]): string {
  const q = query.toLowerCase();

  if (q.includes('due') || q.includes('when') && q.includes('rent')) {
    if (!tenant) return "I couldn't find your tenant record. Please contact your manager.";
    const today = new Date().getDate();
    const diff = tenant.due_date - today;
    if (diff < 0) return `Your rent was due on day ${tenant.due_date} of this month. You are ${Math.abs(diff)} day(s) overdue. Please pay as soon as possible to avoid penalties.`;
    if (diff === 0) return `Your rent is due TODAY (day ${tenant.due_date}). Please make sure to pay promptly!`;
    return `Your rent is due on day ${tenant.due_date} of each month. That's ${diff} day(s) from now. Make sure to pay on time!`;
  }

  if (q.includes('payment history') || q.includes('my payments') || q.includes('paid')) {
    if (!tenant) return "I couldn't find your payment records. Please contact your manager.";
    if (payments.length === 0) return "No payment records found for your account yet.";
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const lateCount = payments.filter(p => p.status === 'late').length;
    const total = payments.reduce((s, p) => s + Number(p.amount), 0);
    return `📊 Your Payment Summary:\n• Total payments: ${payments.length}\n• On-time payments: ${paidCount}\n• Late payments: ${lateCount}\n• Total paid: $${total.toFixed(2)}\n\nYour most recent payment was on ${new Date(payments[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
  }

  if (q.includes('amount') || q.includes('how much') || q.includes('rent amount')) {
    if (!tenant) return "I couldn't find your rental details. Please contact your manager.";
    return `Your monthly rent is $${Number(tenant.rent_amount).toFixed(2)}, due on day ${tenant.due_date} of each month. Unit: ${tenant.unit_number || 'N/A'}.`;
  }

  if (q.includes('contact') || q.includes('manager') || q.includes('landlord')) {
    return "To contact your property manager, go to the Messages tab and send them a direct message. They'll get back to you as soon as possible!";
  }

  if (q.includes('risk') || q.includes('late') || q.includes('score')) {
    if (!tenant) return "I couldn't find your risk assessment. Please contact your manager.";
    const riskMessages: Record<string, string> = {
      low: 'Your risk level is LOW. You have a great payment history! Keep it up.',
      medium: 'Your risk level is MEDIUM. You have had some late payments. Try to pay on time going forward.',
      high: 'Your risk level is HIGH. You have multiple late payments. Please contact your manager to discuss payment arrangements.',
    };
    return riskMessages[tenant.risk_level] || 'Risk level unavailable.';
  }

  if (q.includes('unit') || q.includes('apartment') || q.includes('address')) {
    if (!tenant) return "Unit information not found. Please contact your manager.";
    return `Your unit number is: ${tenant.unit_number || 'Not assigned'}. Please contact your manager for the full address.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return "Hello! I'm your SmartTenant Assistant. I can help you with:\n• Rent due dates\n• Payment history\n• Rental details\n• Contacting your manager\n\nWhat would you like to know?";
  }

  if (q.includes('help') || q.includes('what can you')) {
    return "I can help you with:\n\n1️⃣ Rent due dates — ask 'When is my rent due?'\n2️⃣ Payment history — ask 'Show my payment history'\n3️⃣ Rent amount — ask 'What is my rent amount?'\n4️⃣ Contact manager — ask 'How do I contact my manager?'\n5️⃣ Risk assessment — ask 'What is my risk level?'";
  }

  return "I'm not sure how to answer that. Try asking about your rent due date, payment history, rent amount, or how to contact your manager. You can also tap one of the suggested questions below!";
}

export default function ChatbotScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your SmartTenant Assistant. I can answer questions about your rent, payments, and more. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const t = await getTenantByProfileId(user.id);
      setTenant(t);
      if (t) {
        const p = await getPaymentsByTenant(t.id);
        setPayments(p);
      }
    };
    init();
  }, [user]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      content: text.trim(),
      isBot: false,
      timestamp: new Date(),
    };
    const botResponse = processQuery(text.trim(), tenant, payments);
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: botResponse,
      isBot: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.botIcon}>
          <Bot size={22} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Powered by SmartTenant</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(m => (
            <View key={m.id} style={[styles.msgWrapper, m.isBot ? styles.msgLeft : styles.msgRight]}>
              {m.isBot && (
                <View style={styles.botAvatar}>
                  <Sparkles size={12} color={colors.primary} />
                </View>
              )}
              <View style={[styles.bubble, m.isBot ? styles.botBubble : styles.userBubble]}>
                <Text style={[styles.bubbleText, m.isBot ? styles.botText : styles.userText]}>
                  {m.content}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.suggestedArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedContent}>
            {SUGGESTED_QUESTIONS.map(q => (
              <TouchableOpacity key={q} onPress={() => sendMessage(q)} style={styles.suggestedChip}>
                <Text style={styles.suggestedText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          >
            <Send size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerArea: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, paddingTop: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  botIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  headerSub: { fontSize: fontSize.xs, color: colors.textMuted },
  onlineBadge: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.secondary}20`, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondaryLight },
  onlineText: { fontSize: fontSize.xs, color: colors.secondaryLight, fontWeight: fontWeight.medium },
  messageList: { flex: 1 },
  messageListContent: { padding: spacing.md, paddingBottom: spacing.sm },
  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start', gap: spacing.xs },
  msgRight: { alignSelf: 'flex-end' },
  botAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center',
  },
  bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  botBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: fontSize.md, lineHeight: 22 },
  botText: { color: colors.text },
  userText: { color: colors.white },
  suggestedArea: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  suggestedContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  suggestedChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, backgroundColor: `${colors.primary}15`,
    borderWidth: 1, borderColor: `${colors.primary}40`,
  },
  suggestedText: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: fontWeight.medium },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1, color: colors.text, fontSize: fontSize.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
