import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet,
  RefreshControl, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Plus, Search, X, CreditCard as Edit2, Trash2, User, Mail } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTenants, createTenant, updateTenant, deleteTenant, calculateRiskLevel } from '@/services/tenants';
import { getPaymentsByTenant } from '@/services/payments';
import { TenantCard } from '@/components/TenantCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Tenant, Payment } from '@/types/database';

interface TenantForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

const DEFAULT_TENANT_PASSWORD = 'password123!';

const emptyForm: TenantForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: DEFAULT_TENANT_PASSWORD,
};

export default function TenantsScreen() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getTenants(user.id);
    setTenants(data);
    setFiltered(data);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(tenants);
    } else {
      const q = search.toLowerCase();
      setFiltered(tenants.filter(t =>
        t.full_name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.unit_number.toLowerCase().includes(q)
      ));
    }
  }, [search, tenants]);

  const openAdd = () => {
    setEditingTenant(null);
    setForm({
      ...emptyForm,
      password: DEFAULT_TENANT_PASSWORD,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (tenant: Tenant) => {
    const [firstName, ...rest] = tenant.full_name.trim().split(' ');
    const lastName = rest.join(' ') || '';
    setEditingTenant(tenant);
    setForm({
      firstName,
      lastName,
      email: tenant.email,
      phone: tenant.phone,
      password: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) { setFormError('First name is required'); return; }
    if (!form.lastName.trim()) { setFormError('Last name is required'); return; }
    if (!form.email.trim()) { setFormError('Email is required'); return; }
    if (!form.email.includes('@')) { setFormError('Please enter a valid email address'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
        });
      } else {
        if (!user) return;
        const tenantPassword = form.password.trim() || DEFAULT_TENANT_PASSWORD;
        const riskLevel = calculateRiskLevel(0, 0);
        await createTenant({
          full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: tenantPassword,
          rent_amount: 0, // Rent will be set when assigning to unit
          due_date: 1, // Default due date
          unit_number: '', // Unit will be assigned separately
          admin_id: user.id,
          profile_id: null,
          risk_level: riskLevel,
        });
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tenant: Tenant) => {
    Alert.alert(
      'Delete Tenant',
      `Are you sure you want to remove ${tenant.full_name}? This will also delete all their payment records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteTenant(tenant.id);
            await load();
          }
        }
      ]
    );
  };

  const handleUpdateRisk = async (tenant: Tenant) => {
    const payments = await getPaymentsByTenant(tenant.id);
    const lateCount = payments.filter((p: Payment) => p.status === 'late').length;
    const risk = calculateRiskLevel(lateCount, payments.length);
    if (risk !== tenant.risk_level) {
      await updateTenant(tenant.id, { risk_level: risk });
      await load();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Tenants"
        subtitle={`${tenants.length} total`}
        right={
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchWrapper}>
        <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tenants..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <User size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No tenants found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term' : 'Tap + to add your first tenant'}
            </Text>
          </View>
        ) : (
          filtered.map(tenant => (
            <View key={tenant.id} style={styles.tenantWrapper}>
              <TenantCard tenant={tenant} onPress={() => openEdit(tenant)} />
              <View style={styles.tenantActions}>
                <TouchableOpacity
                  onPress={() => { handleUpdateRisk(tenant); }}
                  style={[styles.actionBtn, styles.riskBtn]}
                >
                  <Text style={styles.riskBtnText}>Update Risk</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(tenant)} style={[styles.actionBtn, styles.editBtn]}>
                  <Edit2 size={14} color={colors.primaryLight} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(tenant)} style={[styles.actionBtn, styles.deleteBtn]}>
                  <Trash2 size={14} color={colors.dangerLight} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {formError ? (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}
              <Input label="First Name *" placeholder="John" value={form.firstName}
                onChangeText={v => setForm(f => ({ ...f, firstName: v }))} />
              <Input label="Last Name *" placeholder="Smith" value={form.lastName}
                onChangeText={v => setForm(f => ({ ...f, lastName: v }))} />
              <Input label="Email *" placeholder="tenant@example.com" value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                keyboardType="email-address" autoCapitalize="none"
                icon={<Mail size={16} color={colors.textMuted} />}
                editable={!editingTenant}
              />
              {!editingTenant ? (
                <Input label="Tenant Password" placeholder="password123!" value={form.password}
                  onChangeText={v => setForm(f => ({ ...f, password: v }))}
                  autoCapitalize="none"
                />
              ) : null}
              <Input label="Phone" placeholder="+1 555 000 0000" value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
              <Text style={styles.noteText}>
                {editingTenant ?
                  'Tenant email is required for account creation. Rent amount, due date, and unit assignment are managed through lease creation.' :
                  'Tenant email is required. Default password is password123! and can be edited before adding.'
                }
              </Text>
              <Button label={editingTenant ? 'Save Changes' : 'Add Tenant'} onPress={handleSave} loading={saving} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md, paddingVertical: spacing.sm + 2 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  tenantWrapper: { marginBottom: spacing.sm },
  tenantActions: {
    flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end',
    marginTop: -spacing.xs, paddingHorizontal: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  riskBtn: { flex: 1, backgroundColor: colors.surfaceAlt },
  riskBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  editBtn: { backgroundColor: `${colors.primary}20`, paddingHorizontal: spacing.md },
  deleteBtn: { backgroundColor: `${colors.danger}15`, paddingHorizontal: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, maxHeight: '90%',
    borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  formError: {
    backgroundColor: `${colors.danger}15`, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: `${colors.danger}40`,
  },
  formErrorText: { color: colors.dangerLight, fontSize: fontSize.sm },
  noteText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.md },
  saveBtn: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
