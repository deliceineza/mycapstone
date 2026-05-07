export type UserRole = 'landlord' | 'tenant';
export type PaymentStatus = 'paid' | 'pending' | 'late';
export type RiskLevel = 'low' | 'medium' | 'high';
export type NotificationType = 'info' | 'warning' | 'payment' | 'reminder';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  name: string;
  phone?: string;
  profileImage?: string;
  mustChangePassword?: boolean;
}

export type Profile = AuthUser;

export interface Tenant {
  id: string;
  lease_id?: string;
  full_name: string;
  phone: string;
  email: string;
  rent_amount: number;
  due_date: number;
  unit_number: string;
  admin_id: string;
  profile_id: string | null;
  risk_level: RiskLevel;
  created_at: string;
}

export interface Payment {
  id: string;
  lease_id?: string;
  tenant_id: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  notes: string;
  created_at: string;
  tenant?: {
    full_name?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: any;
  receiver?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalTenants: number;
  paidCount: number;
  pendingCount: number;
  lateCount: number;
  totalCollected: number;
  totalExpected: number;
  highRiskCount: number;
}
