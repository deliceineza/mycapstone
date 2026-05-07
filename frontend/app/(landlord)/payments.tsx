import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet,
  RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { Plus, X, ListFilter as Filter } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTenants } from '@/services/tenants';
import { getPayments, createPayment, updatePaymentStatus } from '@/services/payments';
import { createNotification } from '@/services/notifications';
import { PaymentItem } from '@/components/PaymentItem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fontSize, fontWeight, spacing, radius } from '@/constants/theme';
import { Payment, PaymentStatus, Tenant } from '@/types/database';

const statuses: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'late', label: 'Late' },
];

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, t] = await Promise.all([getPayments(), getTenants(user.id)]);
    setPayments(p);
    setTenants(t);
    if (t.length > 0 && !selectedTenantId) setSelectedTenantId(t[0].id);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  const handleRecord = async () => {
    if (!selectedTenantId) { setFormError('Select a tenant'); return; }
    if (!amount || isNaN(Number(amount))) { setFormError('Enter a valid amount'); return; }
    setSaving(true);
    setFormError('');
    try {
      await createPayment({ leaseId: selectedTenantId, amount: parseFloat(amount), dueDate: date, notes });
      const tenant = tenants.find(t => t.id === selectedTenantId);
      if (tenant) {
        await createNotification(
          user!.id,
          `Payment of $${amount} recorded for ${tenant.full_name} — ${status}`,
          'payment'
        );
      }
      setShowModal(false);
      setAmount('');
      setNotes('');
      await load();
    } catch (e: any) {
      setFormError(e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Payments"
        subtitle={`${filtered.length} records · $${totalAmount.toFixed(0)}`}
        right={
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {statuses.map(s => (
          <TouchableOpacity
            key={s.value}
            onPress={() => setFilter(s.value)}
            style={[styles.filterChip, filter === s.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === s.value && styles.filterChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        ) : (
          filtered.map(p => <PaymentItem key={p.id} payment={p} showTenant />)
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Record Payment</Text>
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

              <Text style={styles.fieldLabel}>Tenant *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tenantPicker}>
                {tenants.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedTenantId(t.id)}
                    style={[styles.tenantChip, selectedTenantId === t.id && styles.tenantChipActive]}
                  >
                    <Text style={[styles.tenantChipText, selectedTenantId === t.id && styles.tenantChipTextActive]}>
                      {t.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusRow}>
                {(['paid', 'pending', 'late'] as PaymentStatus[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[styles.statusChip, status === s && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label="Amount ($) *" placeholder="1500" value={amount}
                onChangeText={setAmount} keyboardType="numeric" />
              <Input label="Date" placeholder="YYYY-MM-DD" value={date}
                onChangeText={setDate} />
              <Input label="Notes" placeholder="Optional note..." value={notes}
                onChangeText={setNotes} multiline />

              <Button label="Record Payment" onPress={handleRecord} loading={saving} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexGrow: 0, marginBottom: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.primaryLight },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, maxHeight: '85%',
    borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  formError: {
    backgroundColor: `${colors.danger}15`, borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: `${colors.danger}40`,
  },
  formErrorText: { color: colors.dangerLight, fontSize: fontSize.sm },
  fieldLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '500' },
  tenantPicker: { marginBottom: spacing.md },
  tenantChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt, marginRight: spacing.sm,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tenantChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  tenantChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  tenantChipTextActive: { color: colors.primaryLight, fontWeight: fontWeight.semibold },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statusChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent',
  },
  statusChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  statusChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  statusChipTextActive: { color: colors.primaryLight, fontWeight: fontWeight.semibold },
  saveBtn: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
