import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { Payment, PaymentStatus } from '@/types/database';

type BackendPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'overdue';

function mapBackendStatus(status: BackendPaymentStatus | string, dueDate?: string): PaymentStatus {
  if (status === 'completed') return 'paid';
  if (status === 'pending' && dueDate && new Date(dueDate) < new Date()) return 'late';
  if (status === 'overdue' || status === 'failed') return 'late';
  return 'pending';
}

function mapFrontendStatus(status: PaymentStatus): BackendPaymentStatus {
  if (status === 'paid') return 'completed';
  if (status === 'late') return 'overdue';
  return 'pending';
}

export function mapBackendPayment(payment: any): Payment {
  const date = payment.paidAt || payment.paymentDate || payment.dueDate || payment.createdAt;
  const tenantName = payment.tenant
    ? `${payment.tenant.firstName || ''} ${payment.tenant.lastName || ''}`.trim()
    : undefined;

  return {
    id: payment.id,
    lease_id: payment.leaseId,
    tenant_id: payment.tenantId,
    amount: Number(payment.totalAmount ?? payment.amount ?? 0),
    status: mapBackendStatus(payment.status, payment.dueDate),
    date,
    notes: payment.notes ?? '',
    created_at: payment.createdAt ?? date,
    tenant: payment.tenant
      ? {
          full_name: tenantName,
          firstName: payment.tenant.firstName,
          lastName: payment.tenant.lastName
        }
      : undefined
  };
}

export async function getPayments(status?: string, leaseId?: string): Promise<Payment[]> {
  const query = new URLSearchParams();
  if (status) query.append('status', mapFrontendStatus(status as PaymentStatus));
  if (leaseId) query.append('leaseId', leaseId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const data = await apiGet<{ payments: any[] }>(`/api/payments${queryString}`);
  return (data.payments || []).map(mapBackendPayment);
}

export async function getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  const data = await apiGet<{ payments: any[] }>('/api/payments');
  return (data.payments || [])
    .map(mapBackendPayment)
    .filter(payment => payment.tenant_id === tenantId);
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const data = await apiGet<{ payment: any }>(`/api/payments/${id}`);
  return data.payment ? mapBackendPayment(data.payment) : null;
}

export async function createPayment(payment: {
  leaseId: string;
  amount: number;
  dueDate: string;
  paymentType?: string;
  notes?: string;
}): Promise<Payment> {
  const data = await apiPost<{ payment: any }>('/api/payments', payment);
  return mapBackendPayment(data.payment);
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  await apiPut(`/api/payments/${id}/confirm`, { paymentMethod: 'card' });
}

export async function deletePayment(id: string): Promise<void> {
  await apiDelete(`/api/payments/${id}`);
}

export function getStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'paid': return '#059669';
    case 'pending': return '#D97706';
    case 'late': return '#DC2626';
  }
}

export function getStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'pending': return 'Pending';
    case 'late': return 'Late';
  }
}
