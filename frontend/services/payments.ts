import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { Payment, PaymentStatus } from '@/types/database';

export async function getPayments(status?: string, leaseId?: string): Promise<Payment[]> {
  const query = new URLSearchParams();
  if (status) query.append('status', status);
  if (leaseId) query.append('leaseId', leaseId);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const data = await apiGet<{ payments: Payment[] }>(`/api/payments${queryString}`);
  return data.payments || [];
}

export async function getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  const data = await apiGet<{ payments: Payment[] }>(`/api/payments?tenantId=${tenantId}`);
  return data.payments || [];
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const data = await apiGet<{ payment: Payment }>(`/api/payments/${id}`);
  return data.payment || null;
}

export async function createPayment(payment: {
  leaseId: string;
  amount: number;
  dueDate: string;
  paymentType?: string;
  notes?: string;
}): Promise<Payment> {
  const data = await apiPost<{ payment: Payment }>('/api/payments', payment);
  return data.payment;
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
