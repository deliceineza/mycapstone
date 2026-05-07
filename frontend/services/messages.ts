import { apiGet, apiPost } from '@/lib/api';

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

export interface Conversation {
  id: string;
  subject?: string;
  property?: { id: string; name: string; address: string };
  landlord?: ConversationParticipant;
  tenant?: ConversationParticipant;
  unreadCount?: number;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  created_at: string;
  sender?: ConversationParticipant;
}

function mapBackendMessage(message: any): Message {
  return {
    id: message.id,
    content: message.content,
    sender_id: message.senderId,
    receiver_id: '',
    is_read: Boolean(message.isRead),
    created_at: message.createdAt,
    sender: message.sender
  };
}

export async function getConversations(): Promise<Conversation[]> {
  const data = await apiGet<{ conversations: Conversation[] }>('/api/messages/conversations');
  return data.conversations || [];
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const data = await apiGet<{ messages: any[] }>(`/api/messages/conversations/${conversationId}/messages`);
  return (data.messages || []).map(mapBackendMessage);
}

export async function createConversation(recipientId: string, propertyId?: string, subject?: string) {
  const data = await apiPost<{ conversation: Conversation }>('/api/messages/conversations', {
    recipientId,
    propertyId,
    subject
  });
  return data.conversation;
}

export async function sendMessage(conversationId: string, content: string) {
  const data = await apiPost<{ message: any }>(`/api/messages/conversations/${conversationId}/messages`, {
    content
  });
  return mapBackendMessage(data.message);
}

export async function getUnreadMessageCount(): Promise<number> {
  const data = await apiGet<{ unreadCount: number }>('/api/messages/unread-count');
  return data.unreadCount || 0;
}
