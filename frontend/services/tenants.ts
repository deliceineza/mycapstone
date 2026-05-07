import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { Tenant, RiskLevel } from '@/types/database';

function mapBackendTenant(user: any): Tenant {
  const lease = user.tenantLeases?.[0] || null;
  const unit = lease?.unit || null;

  return {
    id: user.id,
    full_name: `${user.firstName} ${user.lastName}`,
    phone: user.phone ?? '',
    email: user.email ?? '',
    rent_amount: lease?.monthlyRent ? Number(lease.monthlyRent) : Number(unit?.rentAmount || 0),
    due_date: lease?.paymentDueDay ?? 1,
    unit_number: unit?.unitNumber ?? '',
    admin_id: lease?.landlordId ?? user.id,
    profile_id: user.id,
    risk_level: 'low',
    created_at: user.createdAt ?? ''
  };
}

export async function getTenants(adminId: string): Promise<Tenant[]> {
  const data = await apiGet<{ tenants: any[] }>('/api/tenants');
  return (data.tenants || []).map(mapBackendTenant);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const data = await apiGet<{ tenant: any }>(`/api/tenants/${id}`);
  return data.tenant ? mapBackendTenant(data.tenant) : null;
}

export async function getCurrentTenantInfo(): Promise<Tenant | null> {
  try {
    const data = await apiGet<{ lease: any }>('/api/leases/tenant/current');
    const lease = data.lease;
    if (!lease) return null;

    const user = lease.tenant;
    const unit = lease.unit;

    if (!user) return null;

    return {
      id: user.id,
      full_name: `${user.firstName} ${user.lastName}`,
      phone: user.phone ?? '',
      email: user.email ?? '',
      rent_amount: lease.monthlyRent ? Number(lease.monthlyRent) : Number(unit?.rentAmount || 0),
      due_date: lease.paymentDueDay ?? 1,
      unit_number: unit?.unitNumber ?? '',
      admin_id: lease.landlordId,
      profile_id: user.id,
      risk_level: 'low',
      created_at: user.createdAt ?? ''
    };
  } catch (error) {
    console.error('Error getting current tenant info:', error);
    return null;
  }
}

export async function getTenantByProfileId(profileId: string): Promise<Tenant | null> {
  return await getCurrentTenantInfo(); // For now, assume current user
}

export async function createTenant(tenant: Omit<Tenant, 'id' | 'created_at'> & { password?: string }): Promise<Tenant> {
  const [firstName, ...rest] = tenant.full_name.trim().split(' ');
  const lastName = rest.join(' ') || 'Tenant';

  const data = await apiPost<{ tenant: any }>('/api/tenants', {
    email: tenant.email,
    firstName,
    lastName,
    phone: tenant.phone,
    password: tenant.password,
    rentAmount: tenant.rent_amount,
    dueDate: tenant.due_date,
    unitNumber: tenant.unit_number
  });

  return mapBackendTenant(data.tenant);
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const payload: any = {};
  if (updates.full_name) {
    const [firstName, ...rest] = updates.full_name.trim().split(' ');
    payload.firstName = firstName;
    payload.lastName = rest.join(' ') || 'Tenant';
  }
  if (updates.phone !== undefined) payload.phone = updates.phone;
  // Note: email, rent_amount, due_date, unit_number updates should be handled through lease management

  const data = await apiPut<{ tenant: any }>(`/api/tenants/${id}`, payload);
  return mapBackendTenant(data.tenant);
}

export async function deleteTenant(id: string): Promise<void> {
  await apiDelete(`/api/tenants/${id}`);
}

export function calculateRiskLevel(lateCount: number, totalCount: number): RiskLevel {
  if (totalCount === 0) return 'low';
  const ratio = lateCount / totalCount;
  if (ratio >= 0.3) return 'high';
  if (ratio >= 0.1) return 'medium';
  return 'low';
}
