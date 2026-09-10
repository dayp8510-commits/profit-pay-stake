import { supabase } from './supabase';

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingDeposits: number;
  pendingDepositsCount: number;
  pendingWithdrawals: number;
  pendingWithdrawalsCount: number;
  activeInvestments: number;
  totalDeposits: number;
  totalWithdrawals: number;
  openTickets: number;
  pendingKyc: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  is_demo: boolean;
  is_verified: boolean;
  is_suspended: boolean;
  available_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  created_at: string;
}

export interface AdminDeposit {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  currency: string;
  withdrawal_method: string;
  destination_details: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AdminPlan {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  duration_days: number;
  fee_pct: number;
  risk_level: string;
  status: string;
  created_at: string;
}

export interface AdminTicket {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminKycRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  document_type: string;
  document_number: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminInvestment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string | null;
  profit_loss: number;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  is_platform: boolean;
  created_at: string;
}

export async function checkAdmin(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const role = session.user.app_metadata?.role;
  return role === 'admin';
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [
    { count: totalUsers },
    { count: verifiedUsers },
    { data: pendingDepositsData },
    { data: pendingWithdrawalsData },
    { count: activeInvestments },
    { data: depositsData },
    { data: withdrawalsData },
    { count: openTickets },
    { count: pendingKyc },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('deposits').select('amount').eq('status', 'pending'),
    supabase.from('withdrawals').select('amount').eq('status', 'pending'),
    supabase.from('investments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('deposits').select('amount').eq('status', 'approved'),
    supabase.from('withdrawals').select('amount').eq('status', 'completed'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const pendingDeposits = pendingDepositsData?.reduce((s, d) => s + Number(d.amount), 0) ?? 0;
  const pendingWithdrawals = pendingWithdrawalsData?.reduce((s, w) => s + Number(w.amount), 0) ?? 0;
  const totalDeposits = depositsData?.reduce((s, d) => s + Number(d.amount), 0) ?? 0;
  const totalWithdrawals = withdrawalsData?.reduce((s, w) => s + Number(w.amount), 0) ?? 0;

  return {
    totalUsers: totalUsers ?? 0,
    verifiedUsers: verifiedUsers ?? 0,
    pendingDeposits,
    pendingDepositsCount: pendingDepositsData?.length ?? 0,
    pendingWithdrawals,
    pendingWithdrawalsCount: pendingWithdrawalsData?.length ?? 0,
    activeInvestments: activeInvestments ?? 0,
    totalDeposits,
    totalWithdrawals,
    openTickets: openTickets ?? 0,
    pendingKyc: pendingKyc ?? 0,
  };
}

export async function fetchAdminUsers(search?: string): Promise<AdminUser[]> {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  const { data } = await query.limit(100);
  return (data ?? []) as AdminUser[];
}

export async function fetchAdminDeposits(status?: string): Promise<AdminDeposit[]> {
  let query = supabase.from('deposits').select(`
    id, user_id, amount, currency, payment_method, reference, status, admin_note, created_at, reviewed_at,
    profiles!inner(email, first_name, last_name)
  `).order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query.limit(100);
  return (data ?? []).map((d: Record<string, unknown>) => {
    const p = d.profiles as Record<string, string | null>;
    return {
      id: d.id as string, user_id: d.user_id as string, amount: d.amount as number,
      currency: d.currency as string, payment_method: d.payment_method as string,
      reference: d.reference as string | null, status: d.status as string,
      admin_note: d.admin_note as string | null, created_at: d.created_at as string,
      reviewed_at: d.reviewed_at as string | null,
      user_email: p?.email ?? '', user_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
    };
  });
}

export async function fetchAdminWithdrawals(status?: string): Promise<AdminWithdrawal[]> {
  let query = supabase.from('withdrawals').select(`
    id, user_id, amount, currency, withdrawal_method, destination_details, status, admin_note, created_at, completed_at,
    profiles!inner(email, first_name, last_name)
  `).order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query.limit(100);
  return (data ?? []).map((w: Record<string, unknown>) => {
    const p = w.profiles as Record<string, string | null>;
    return {
      id: w.id as string, user_id: w.user_id as string, amount: w.amount as number,
      currency: w.currency as string, withdrawal_method: w.withdrawal_method as string,
      destination_details: w.destination_details as string | null, status: w.status as string,
      admin_note: w.admin_note as string | null, created_at: w.created_at as string,
      completed_at: w.completed_at as string | null,
      user_email: p?.email ?? '', user_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
    };
  });
}

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  const { data } = await supabase.from('investment_plans').select('*').order('created_at', { ascending: false });
  return (data ?? []) as AdminPlan[];
}

export async function createAdminPlan(plan: Omit<AdminPlan, 'id' | 'created_at'>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('investment_plans').insert({
    name: plan.name, description: plan.description, min_amount: plan.min_amount,
    max_amount: plan.max_amount, duration_days: plan.duration_days, fee_pct: plan.fee_pct,
    risk_level: plan.risk_level, status: plan.status,
  });
  if (!error) await logAuditAction('plan_created', 'investment_plan', null, { name: plan.name });
  return { error: error?.message ?? null };
}

export async function updateAdminPlan(id: string, updates: Partial<AdminPlan>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('investment_plans').update({
    name: updates.name, description: updates.description, min_amount: updates.min_amount,
    max_amount: updates.max_amount, duration_days: updates.duration_days, fee_pct: updates.fee_pct,
    risk_level: updates.risk_level, status: updates.status,
  }).eq('id', id);
  if (!error) await logAuditAction('plan_updated', 'investment_plan', id, updates);
  return { error: error?.message ?? null };
}

export async function fetchAdminTickets(status?: string): Promise<AdminTicket[]> {
  let query = supabase.from('support_tickets').select(`
    id, user_id, subject, category, status, priority, created_at, updated_at,
    profiles!inner(email, first_name, last_name)
  `).order('updated_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query.limit(100);
  return (data ?? []).map((t: Record<string, unknown>) => {
    const p = t.profiles as Record<string, string | null>;
    return {
      id: t.id as string, user_id: t.user_id as string, subject: t.subject as string,
      category: t.category as string, status: t.status as string, priority: t.priority as string,
      created_at: t.created_at as string, updated_at: t.updated_at as string,
      user_email: p?.email ?? '', user_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
    };
  });
}

export async function fetchTicketMessages(ticketId: string): Promise<AdminTicketMessage[]> {
  const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  return (data ?? []) as AdminTicketMessage[];
}

export async function replyToTicket(ticketId: string, userId: string, message: string): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const adminId = session?.user.id ?? userId;
  const { error } = await supabase.from('support_messages').insert({
    ticket_id: ticketId, user_id: adminId, message, is_admin_reply: true,
  });
  if (!error) {
    await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticketId);
    await logAuditAction('ticket_replied', 'support_ticket', ticketId, {});
  }
  return { error: error?.message ?? null };
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
  if (!error) await logAuditAction('ticket_status_changed', 'support_ticket', ticketId, { status });
  return { error: error?.message ?? null };
}

export async function approveDeposit(depositId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('deposits').update({
    status: 'approved', reviewed_at: new Date().toISOString(),
  }).eq('id', depositId);
  if (!error) {
    const { data: deposit } = await supabase.from('deposits').select('amount, user_id').eq('id', depositId).maybeSingle();
    if (deposit) {
      const { data: profile } = await supabase.from('profiles').select('available_balance, total_deposits').eq('id', deposit.user_id).maybeSingle();
      if (profile) {
        await supabase.from('profiles').update({
          available_balance: Number(profile.available_balance) + Number(deposit.amount),
          total_deposits: Number(profile.total_deposits) + Number(deposit.amount),
        }).eq('id', deposit.user_id);
      }
      await supabase.from('transactions').insert({
        user_id: deposit.user_id, type: 'deposit', amount: Number(deposit.amount),
        currency: 'USD', status: 'completed', description: 'Deposit approved',
        reference_id: depositId,
      });
      await supabase.from('notifications').insert({
        user_id: deposit.user_id, title: 'Deposit approved',
        message: `Your deposit of $${Number(deposit.amount).toLocaleString()} has been approved.`,
        type: 'deposit',
      });
    }
    await logAuditAction('deposit_approved', 'deposit', depositId, { userId });
  }
  return { error: error?.message ?? null };
}

export async function rejectDeposit(depositId: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('deposits').update({
    status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString(),
  }).eq('id', depositId);
  if (!error) {
    const { data: deposit } = await supabase.from('deposits').select('user_id, amount').eq('id', depositId).maybeSingle();
    if (deposit) {
      await supabase.from('notifications').insert({
        user_id: deposit.user_id, title: 'Deposit rejected',
        message: `Your deposit request of $${Number(deposit.amount).toLocaleString()} was rejected. ${note}`,
        type: 'deposit',
      });
    }
    await logAuditAction('deposit_rejected', 'deposit', depositId, { note });
  }
  return { error: error?.message ?? null };
}

export async function approveWithdrawal(withdrawalId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('withdrawals').update({
    status: 'completed', completed_at: new Date().toISOString(),
  }).eq('id', withdrawalId);
  if (!error) {
    const { data: withdrawal } = await supabase.from('withdrawals').select('amount, user_id').eq('id', withdrawalId).maybeSingle();
    if (withdrawal) {
      const { data: profile } = await supabase.from('profiles').select('available_balance, total_withdrawals').eq('id', withdrawal.user_id).maybeSingle();
      if (profile) {
        await supabase.from('profiles').update({
          available_balance: Number(profile.available_balance) - Number(withdrawal.amount),
          total_withdrawals: Number(profile.total_withdrawals) + Number(withdrawal.amount),
        }).eq('id', withdrawal.user_id);
      }
      await supabase.from('transactions').insert({
        user_id: withdrawal.user_id, type: 'withdrawal', amount: -Number(withdrawal.amount),
        currency: 'USD', status: 'completed', description: 'Withdrawal completed',
        reference_id: withdrawalId,
      });
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id, title: 'Withdrawal completed',
        message: `Your withdrawal of $${Number(withdrawal.amount).toLocaleString()} has been processed.`,
        type: 'withdrawal',
      });
    }
    await logAuditAction('withdrawal_approved', 'withdrawal', withdrawalId, {});
  }
  return { error: error?.message ?? null };
}

export async function rejectWithdrawal(withdrawalId: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('withdrawals').update({
    status: 'rejected', admin_note: note,
  }).eq('id', withdrawalId);
  if (!error) {
    const { data: withdrawal } = await supabase.from('withdrawals').select('user_id, amount').eq('id', withdrawalId).maybeSingle();
    if (withdrawal) {
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id, title: 'Withdrawal rejected',
        message: `Your withdrawal request of $${Number(withdrawal.amount).toLocaleString()} was rejected. ${note}`,
        type: 'withdrawal',
      });
    }
    await logAuditAction('withdrawal_rejected', 'withdrawal', withdrawalId, { note });
  }
  return { error: error?.message ?? null };
}

export async function fetchAdminKyc(status?: string): Promise<AdminKycRecord[]> {
  let query = supabase.from('kyc_records').select(`
    id, user_id, document_type, document_number, status, admin_note, created_at, reviewed_at,
    profiles!inner(email, first_name, last_name)
  `).order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query.limit(100);
  return (data ?? []).map((k: Record<string, unknown>) => {
    const p = k.profiles as Record<string, string | null>;
    return {
      id: k.id as string, user_id: k.user_id as string, document_type: k.document_type as string,
      document_number: k.document_number as string | null, status: k.status as string,
      admin_note: k.admin_note as string | null, created_at: k.created_at as string,
      reviewed_at: k.reviewed_at as string | null,
      user_email: p?.email ?? '', user_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
    };
  });
}

export async function reviewKyc(kycId: string, approved: boolean, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('kyc_records').update({
    status: approved ? 'approved' : 'rejected', admin_note: note, reviewed_at: new Date().toISOString(),
  }).eq('id', kycId);
  if (!error) {
    if (approved) {
      const { data: kyc } = await supabase.from('kyc_records').select('user_id').eq('id', kycId).maybeSingle();
      if (kyc) {
        await supabase.from('profiles').update({ is_verified: true }).eq('id', kyc.user_id);
        await supabase.from('notifications').insert({
          user_id: kyc.user_id, title: 'Identity verified',
          message: 'Your identity verification has been approved.', type: 'security',
        });
      }
    }
    await logAuditAction(approved ? 'kyc_approved' : 'kyc_rejected', 'kyc_record', kycId, { note });
  }
  return { error: error?.message ?? null };
}

export async function fetchAdminInvestments(): Promise<AdminInvestment[]> {
  const { data } = await supabase.from('investments').select(`
    id, user_id, amount, status, start_date, end_date, profit_loss, created_at,
    investment_plans(name),
    profiles!inner(email, first_name, last_name)
  `).order('created_at', { ascending: false }).limit(100);
  return (data ?? []).map((i: Record<string, unknown>) => {
    const p = i.profiles as Record<string, string | null>;
    const plan = i.investment_plans as Record<string, string> | null;
    return {
      id: i.id as string, user_id: i.user_id as string, amount: i.amount as number,
      status: i.status as string, start_date: i.start_date as string,
      end_date: i.end_date as string | null, profit_loss: i.profit_loss as number,
      created_at: i.created_at as string,
      user_email: p?.email ?? '', user_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
      plan_name: plan?.name ?? 'Unknown',
    };
  });
}

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  return (data ?? []) as AdminNotification[];
}

export async function sendPlatformNotification(title: string, message: string, type: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notifications').insert({
    title, message, type, is_platform: true, user_id: null,
  });
  if (!error) await logAuditAction('notification_sent', 'notification', null, { title, type });
  return { error: error?.message ?? null };
}

export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  return (data ?? []) as AdminAuditLog[];
}

export async function suspendUser(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId);
  if (!error) {
    await logAuditAction('user_suspended', 'profile', userId, {});
    await supabase.from('notifications').insert({
      user_id: userId, title: 'Account suspended',
      message: 'Your account has been suspended. Contact support for assistance.', type: 'security',
    });
  }
  return { error: error?.message ?? null };
}

export async function reactivateUser(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_suspended: false }).eq('id', userId);
  if (!error) await logAuditAction('user_reactivated', 'profile', userId, {});
  return { error: error?.message ?? null };
}

export async function verifyUser(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
  if (!error) {
    await logAuditAction('user_verified', 'profile', userId, {});
    await supabase.from('notifications').insert({
      user_id: userId, title: 'Account verified',
      message: 'Your account has been verified.', type: 'security',
    });
  }
  return { error: error?.message ?? null };
}

async function logAuditAction(action: string, targetType: string | null, targetId: string | null, details: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('audit_logs').insert({
    admin_id: session.user.id, action, target_type: targetType, target_id: targetId, details,
  });
}

export function formatCurrency(amount: number): string {
  return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
