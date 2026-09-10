import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Ban, Bell, BriefcaseBusiness, Check, ChevronDown, Clock3, FileText, Globe2, LayoutDashboard, LifeBuoy, Loader2, Plus, Search, Send, Settings2, ShieldCheck, TrendingUp, UsersRound, WalletCards, X } from 'lucide-react';
import {
  type AdminAuditLog, type AdminDeposit, type AdminInvestment, type AdminKycRecord, type AdminNotification,
  type AdminPlan, type AdminStats, type AdminTicket, type AdminTicketMessage, type AdminUser, type AdminWithdrawal,
  approveDeposit, approveWithdrawal, checkAdmin, createAdminPlan, fetchAdminAuditLogs, fetchAdminDeposits,
  fetchAdminInvestments, fetchAdminKyc, fetchAdminNotifications, fetchAdminPlans, fetchAdminStats, fetchAdminTickets,
  fetchAdminUsers, fetchAdminWithdrawals, fetchTicketMessages, formatCurrency, formatDate, formatDateTime,
  reactivateUser, rejectDeposit, rejectWithdrawal, replyToTicket, reviewKyc, sendPlatformNotification,
  suspendUser, updateAdminPlan, updateTicketStatus, verifyUser,
} from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Toast = { id: number; type: 'success' | 'error'; message: string };

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

function Toasts({ toasts }: { toasts: Toast[] }) {
  return <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <Check size={16} /> : <X size={16} />}{t.message}</div>)}</div>;
}

function useConfirm() {
  const [state, setState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const confirm = useCallback((title: string, message: string, onConfirm: () => void) => setState({ title, message, onConfirm }), []);
  const ConfirmDialog = state ? <div className="modal-backdrop" onClick={() => setState(null)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>{state.title}</h2><button className="icon-btn" onClick={() => setState(null)}><X size={18} /></button></div><p className="confirm-msg">{state.message}</p><div className="confirm-actions"><button className="btn btn-ghost" onClick={() => setState(null)}>Cancel</button><button className="btn btn-dark" onClick={() => { state.onConfirm(); setState(null); }}>Confirm</button></div></div></div> : null;
  return { confirm, ConfirmDialog };
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'approved' || status === 'completed' || status === 'resolved' || status === 'active' || status === 'closed' ? 'approved' : status === 'rejected' || status === 'failed' ? 'rejected' : 'pending';
  return <span className={`status ${cls}`}>{status.replace('_', ' ')}</span>;
}

function RiskBadge({ level }: { level: string }) {
  return <span className={`risk-badge ${level}`}>{level.replace('_', ' ')} risk</span>;
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return <div className="admin-empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{message}</p></div>;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div className="search-box"><Search size={16} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function FilterPills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="pills">{options.map(o => <button key={o} className={value === o ? 'active' : ''} onClick={() => onChange(o)}>{o === 'all' ? 'All' : o.charAt(0).toUpperCase() + o.slice(1)}</button>)}</div>;
}

function LoadingSpinner() { return <div className="admin-loading"><Loader2 size={28} className="spin" /></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="admin-empty"><div className="empty-icon"><X size={24} /></div><h3>Something went wrong</h3><p>{message}</p>{onRetry && <button className="btn btn-dark" onClick={onRetry}>Try again</button>}</div>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, l] = await Promise.all([fetchAdminStats(), fetchAdminAuditLogs()]);
      setStats(s); setLogs(l.slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return null;

  return <>
    <div className="stats-grid">
      <StatCard label="Total users" value={stats.totalUsers.toLocaleString()} change={`${stats.verifiedUsers} verified`} icon={<UsersRound />} />
      <StatCard label="Pending deposits" value={formatCurrency(stats.pendingDeposits)} change={`${stats.pendingDepositsCount} requests`} icon={<ArrowDownToLine />} tone="gold" />
      <StatCard label="Pending withdrawals" value={formatCurrency(stats.pendingWithdrawals)} change={`${stats.pendingWithdrawalsCount} requests`} icon={<ArrowUpFromLine />} tone="blue" />
      <StatCard label="Open tickets" value={stats.openTickets.toString()} change={`${stats.pendingKyc} KYC pending`} icon={<LifeBuoy />} tone="green" />
    </div>
    <div className="stats-grid">
      <StatCard label="Total deposits" value={formatCurrency(stats.totalDeposits)} change="All time" icon={<WalletCards />} />
      <StatCard label="Total withdrawals" value={formatCurrency(stats.totalWithdrawals)} change="All time" icon={<ArrowUpFromLine />} tone="blue" />
      <StatCard label="Active investments" value={stats.activeInvestments.toLocaleString()} change="In progress" icon={<BriefcaseBusiness />} tone="gold" />
      <StatCard label="Verified users" value={stats.verifiedUsers.toLocaleString()} change={`${stats.totalUsers > 0 ? Math.round(stats.verifiedUsers / stats.totalUsers * 100) : 0}% of total`} icon={<ShieldCheck />} tone="green" />
    </div>
    <div className="panel">
      <div className="panel-heading">
        <div><h3>Recent audit activity</h3><span className="muted">Sensitive actions are recorded</span></div>
      </div>
      {logs.length === 0 ? <EmptyState icon={<FileText />} title="No audit activity yet" message="Admin actions will appear here as they occur." /> :
        logs.map(log => <div className="audit-row" key={log.id}>
          <span className="audit-dot" />
          <div><strong>{log.action.replace(/_/g, ' ')}</strong><small>{formatDateTime(log.created_at)}</small></div>
          <span className="muted">{log.target_type ?? '—'}</span>
        </div>)}
    </div>
  </>;
}

function StatCard({ label, value, change, icon, tone = 'teal' }: { label: string; value: string; change?: string; icon: React.ReactNode; tone?: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><strong>{value}</strong>{change && <small>{change}</small>}</div>;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { push } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setUsers(await fetchAdminUsers(search)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function handleSuspend(user: AdminUser) {
    confirm('Suspend user', `Suspend ${user.email}? They will lose access until reactivated.`, async () => {
      const { error } = await suspendUser(user.id);
      if (error) push('error', error); else { push('success', 'User suspended'); load(); }
    });
  }
  async function handleReactivate(user: AdminUser) {
    const { error } = await reactivateUser(user.id);
    if (error) push('error', error); else { push('success', 'User reactivated'); load(); }
  }
  async function handleVerify(user: AdminUser) {
    const { error } = await verifyUser(user.id);
    if (error) push('error', error); else { push('success', 'User verified'); load(); }
  }

  return <>
    <div className="filter-row"><SearchBar value={search} onChange={setSearch} placeholder="Search by name or email" /></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      users.length === 0 ? <EmptyState icon={<UsersRound />} title="No users found" message="Users will appear here when they register." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>User</span><span>Status</span><span>Balance</span><span>Deposits</span><span>Joined</span><span>Actions</span></div>
        {users.map(u => <div className="admin-table-row" key={u.id}>
          <div className="admin-user-cell">
            <span className="avatar">{(u.first_name ?? u.email)[0].toUpperCase()}</span>
            <div><strong>{u.first_name} {u.last_name}</strong><small>{u.email}</small></div>
          </div>
          <div className="admin-status-cell">
            {u.is_suspended && <span className="status rejected">suspended</span>}
            {u.is_verified && !u.is_suspended && <span className="status approved">verified</span>}
            {!u.is_verified && !u.is_suspended && <span className="status pending">unverified</span>}
          </div>
          <span>{formatCurrency(u.available_balance)}</span>
          <span>{formatCurrency(u.total_deposits)}</span>
          <span className="muted">{formatDate(u.created_at)}</span>
          <div className="admin-action-cell">
            {!u.is_verified && <button className="btn btn-ghost btn-sm" title="Verify" onClick={() => handleVerify(u)}><Check size={14} /></button>}
            {u.is_suspended ? <button className="btn btn-ghost btn-sm" title="Reactivate" onClick={() => handleReactivate(u)}><ShieldCheck size={14} /></button>
              : <button className="btn btn-ghost btn-sm" title="Suspend" onClick={() => handleSuspend(u)}><Ban size={14} /></button>}
          </div>
        </div>)}
      </div></div>}
    {ConfirmDialog}
  </>;
}

export function AdminDeposits() {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const { push } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDeposits(await fetchAdminDeposits(filter)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(d: AdminDeposit) {
    confirm('Approve deposit', `Approve ${formatCurrency(d.amount)} for ${d.user_email}? This will credit their balance.`, async () => {
      const { error } = await approveDeposit(d.id, d.user_id);
      if (error) push('error', error); else { push('success', 'Deposit approved'); load(); }
    });
  }
  async function handleReject(d: AdminDeposit) {
    confirm('Reject deposit', `Reject ${formatCurrency(d.amount)} for ${d.user_email}?`, async () => {
      const { error } = await rejectDeposit(d.id, 'Request does not meet requirements.');
      if (error) push('error', error); else { push('success', 'Deposit rejected'); load(); }
    });
  }

  return <>
    <div className="filter-row"><FilterPills options={['all', 'pending', 'approved', 'rejected']} value={filter} onChange={setFilter} /></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      deposits.length === 0 ? <EmptyState icon={<ArrowDownToLine />} title="No deposits found" message="Deposit requests will appear here." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>User</span><span>Amount</span><span>Method</span><span>Reference</span><span>Status</span><span>Date</span><span>Actions</span></div>
        {deposits.map(d => <div className="admin-table-row" key={d.id}>
          <div className="admin-user-cell"><div><strong>{d.user_name || 'Unknown'}</strong><small>{d.user_email}</small></div></div>
          <strong>{formatCurrency(d.amount)}</strong>
          <span>{d.payment_method}</span>
          <span className="muted">{d.reference ?? '—'}</span>
          <StatusBadge status={d.status} />
          <span className="muted">{formatDate(d.created_at)}</span>
          <div className="admin-action-cell">
            {d.status === 'pending' && <>
              <button className="btn btn-dark btn-sm" onClick={() => handleApprove(d)}><Check size={14} /> Approve</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleReject(d)}><X size={14} /> Reject</button>
            </>}
          </div>
        </div>)}
      </div></div>}
    {ConfirmDialog}
  </>;
}

export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const { push } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setWithdrawals(await fetchAdminWithdrawals(filter)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(w: AdminWithdrawal) {
    confirm('Approve withdrawal', `Approve ${formatCurrency(w.amount)} for ${w.user_email}? This will debit their balance.`, async () => {
      const { error } = await approveWithdrawal(w.id);
      if (error) push('error', error); else { push('success', 'Withdrawal approved'); load(); }
    });
  }
  async function handleReject(w: AdminWithdrawal) {
    confirm('Reject withdrawal', `Reject ${formatCurrency(w.amount)} for ${w.user_email}?`, async () => {
      const { error } = await rejectWithdrawal(w.id, 'Unable to process at this time.');
      if (error) push('error', error); else { push('success', 'Withdrawal rejected'); load(); }
    });
  }

  return <>
    <div className="filter-row"><FilterPills options={['all', 'pending', 'processing', 'completed', 'rejected']} value={filter} onChange={setFilter} /></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      withdrawals.length === 0 ? <EmptyState icon={<ArrowUpFromLine />} title="No withdrawals found" message="Withdrawal requests will appear here." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>User</span><span>Amount</span><span>Method</span><span>Destination</span><span>Status</span><span>Date</span><span>Actions</span></div>
        {withdrawals.map(w => <div className="admin-table-row" key={w.id}>
          <div className="admin-user-cell"><div><strong>{w.user_name || 'Unknown'}</strong><small>{w.user_email}</small></div></div>
          <strong>{formatCurrency(w.amount)}</strong>
          <span>{w.withdrawal_method}</span>
          <span className="muted">{w.destination_details ?? '—'}</span>
          <StatusBadge status={w.status} />
          <span className="muted">{formatDate(w.created_at)}</span>
          <div className="admin-action-cell">
            {w.status === 'pending' && <>
              <button className="btn btn-dark btn-sm" onClick={() => handleApprove(w)}><Check size={14} /> Approve</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleReject(w)}><X size={14} /> Reject</button>
            </>}
          </div>
        </div>)}
      </div></div>}
    {ConfirmDialog}
  </>;
}

export function AdminPlans() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPlans(await fetchAdminPlans()); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(plan: AdminPlan) {
    const newStatus = plan.status === 'active' ? 'disabled' : 'active';
    const { error } = await updateAdminPlan(plan.id, { status: newStatus });
    if (error) push('error', error); else { push('success', `Plan ${newStatus}`); load(); }
  }

  return <>
    <div className="filter-row"><button className="btn btn-dark" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Create plan</button></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      plans.length === 0 ? <EmptyState icon={<BriefcaseBusiness />} title="No investment plans" message="Create plans for users to explore." /> :
      <div className="plans-grid plans-large">
        {plans.map(p => <div className="plan-card" key={p.id}>
          <div className="plan-top"><RiskBadge level={p.risk_level} /></div>
          <h3>{p.name}</h3>
          <p>{p.description ?? 'No description'}</p>
          <div className="plan-meta"><span>From <strong>{formatCurrency(p.min_amount)}</strong></span><span>To <strong>{formatCurrency(p.max_amount)}</strong></span></div>
          <div className="plan-meta"><span>{p.duration_days} days</span><span>Fee {p.fee_pct}%</span></div>
          <div className="plan-line" />
          <div className="plan-bottom">
            <StatusBadge status={p.status} />
            <div className="plan-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(p); setShowForm(true); }}>Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(p)}>{p.status === 'active' ? 'Disable' : 'Enable'}</button>
            </div>
          </div>
        </div>)}
      </div>}
    {showForm && <PlanFormModal plan={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} push={push} />}
  </>;
}

function PlanFormModal({ plan, onClose, onSaved, push }: { plan: AdminPlan | null; onClose: () => void; onSaved: () => void; push: (t: 'success' | 'error', m: string) => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '', description: plan?.description ?? '', min_amount: plan?.min_amount ?? 100,
    max_amount: plan?.max_amount ?? 10000, duration_days: plan?.duration_days ?? 30, fee_pct: plan?.fee_pct ?? 1,
    risk_level: plan?.risk_level ?? 'medium', status: plan?.status ?? 'active',
  });
  const [busy, setBusy] = useState(false);
  const update = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const payload = { ...form, min_amount: Number(form.min_amount), max_amount: Number(form.max_amount), duration_days: Number(form.duration_days), fee_pct: Number(form.fee_pct) };
    if (plan) {
      const { error } = await updateAdminPlan(plan.id, payload);
      if (error) push('error', error); else { push('success', 'Plan updated'); onSaved(); }
    } else {
      const { error } = await createAdminPlan(payload);
      if (error) push('error', error); else { push('success', 'Plan created'); onSaved(); }
    }
    setBusy(false);
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><h2>{plan ? 'Edit plan' : 'Create plan'}</h2><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span>Plan name</span><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Growth focus" required /></label>
      <label className="field"><span>Description</span><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe the plan…" rows={3} /></label>
      <div className="form-two">
        <label className="field"><span>Minimum amount</span><input type="number" value={form.min_amount} onChange={e => update('min_amount', e.target.value)} required /></label>
        <label className="field"><span>Maximum amount</span><input type="number" value={form.max_amount} onChange={e => update('max_amount', e.target.value)} required /></label>
      </div>
      <div className="form-two">
        <label className="field"><span>Duration (days)</span><input type="number" value={form.duration_days} onChange={e => update('duration_days', e.target.value)} required /></label>
        <label className="field"><span>Fee (%)</span><input type="number" step="0.01" value={form.fee_pct} onChange={e => update('fee_pct', e.target.value)} required /></label>
      </div>
      <div className="form-two">
        <label className="field"><span>Risk level</span>
          <select value={form.risk_level} onChange={e => update('risk_level', e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option>
          </select>
        </label>
        <label className="field"><span>Status</span>
          <select value={form.status} onChange={e => update('status', e.target.value)}>
            <option value="active">Active</option><option value="disabled">Disabled</option>
          </select>
        </label>
      </div>
      <button className="btn btn-dark btn-full" disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</button>
    </form>
  </div></div>;
}

export function AdminKyc() {
  const [records, setRecords] = useState<AdminKycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const { push } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRecords(await fetchAdminKyc(filter)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(k: AdminKycRecord) {
    confirm('Approve KYC', `Verify identity for ${k.user_email}?`, async () => {
      const { error } = await reviewKyc(k.id, true, 'Identity verified.');
      if (error) push('error', error); else { push('success', 'KYC approved'); load(); }
    });
  }
  async function handleReject(k: AdminKycRecord) {
    confirm('Reject KYC', `Reject identity submission for ${k.user_email}?`, async () => {
      const { error } = await reviewKyc(k.id, false, 'Document does not meet requirements.');
      if (error) push('error', error); else { push('success', 'KYC rejected'); load(); }
    });
  }

  return <>
    <div className="filter-row"><FilterPills options={['all', 'pending', 'approved', 'rejected']} value={filter} onChange={setFilter} /></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      records.length === 0 ? <EmptyState icon={<ShieldCheck />} title="No KYC records" message="Identity submissions will appear here." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>User</span><span>Document type</span><span>Document #</span><span>Status</span><span>Submitted</span><span>Actions</span></div>
        {records.map(k => <div className="admin-table-row" key={k.id}>
          <div className="admin-user-cell"><div><strong>{k.user_name || 'Unknown'}</strong><small>{k.user_email}</small></div></div>
          <span>{k.document_type.replace('_', ' ')}</span>
          <span className="muted">{k.document_number ?? '—'}</span>
          <StatusBadge status={k.status} />
          <span className="muted">{formatDate(k.created_at)}</span>
          <div className="admin-action-cell">
            {k.status === 'pending' && <>
              <button className="btn btn-dark btn-sm" onClick={() => handleApprove(k)}><Check size={14} /> Approve</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleReject(k)}><X size={14} /> Reject</button>
            </>}
          </div>
        </div>)}
      </div></div>}
    {ConfirmDialog}
  </>;
}

export function AdminInvestments() {
  const [investments, setInvestments] = useState<AdminInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setInvestments(await fetchAdminInvestments()); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (investments.length === 0) return <EmptyState icon={<BriefcaseBusiness />} title="No investments" message="User investments will appear here." />;

  return <div className="panel"><div className="admin-table">
    <div className="admin-table-head"><span>User</span><span>Plan</span><span>Amount</span><span>P/L</span><span>Status</span><span>Started</span></div>
    {investments.map(i => <div className="admin-table-row" key={i.id}>
      <div className="admin-user-cell"><div><strong>{i.user_name || 'Unknown'}</strong><small>{i.user_email}</small></div></div>
      <span>{i.plan_name}</span>
      <strong>{formatCurrency(i.amount)}</strong>
      <span className={i.profit_loss >= 0 ? 'positive' : 'negative'}>{i.profit_loss >= 0 ? '+' : ''}{formatCurrency(i.profit_loss)}</span>
      <StatusBadge status={i.status} />
      <span className="muted">{formatDate(i.start_date)}</span>
    </div>)}
  </div></div>;
}

export function AdminTickets() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminTicket | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTickets(await fetchAdminTickets(filter)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (selected) return <TicketDetail ticket={selected} onBack={() => { setSelected(null); load(); }} push={push} />;

  return <>
    <div className="filter-row"><FilterPills options={['all', 'open', 'in_progress', 'resolved', 'closed']} value={filter} onChange={setFilter} /></div>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      tickets.length === 0 ? <EmptyState icon={<LifeBuoy />} title="No support tickets" message="Tickets will appear here when users submit them." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>User</span><span>Subject</span><span>Category</span><span>Priority</span><span>Status</span><span>Updated</span><span></span></div>
        {tickets.map(t => <div className="admin-table-row" key={t.id}>
          <div className="admin-user-cell"><div><strong>{t.user_name || 'Unknown'}</strong><small>{t.user_email}</small></div></div>
          <span>{t.subject}</span>
          <span className="muted">{t.category}</span>
          <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
          <StatusBadge status={t.status} />
          <span className="muted">{formatDate(t.updated_at)}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(t)}>Open <ArrowRight size={14} /></button>
        </div>)}
      </div></div>}
  </>;
}

function TicketDetail({ ticket, onBack, push }: { ticket: AdminTicket; onBack: () => void; push: (t: 'success' | 'error', m: string) => void }) {
  const [messages, setMessages] = useState<AdminTicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessages(await fetchTicketMessages(ticket.id));
      setLoading(false);
    })();
  }, [ticket.id]);

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    const { error } = await replyToTicket(ticket.id, ticket.user_id, reply);
    if (error) push('error', error);
    else {
      setReply('');
      setMessages(await fetchTicketMessages(ticket.id));
      push('success', 'Reply sent');
    }
    setBusy(false);
  }

  async function closeTicket() {
    const { error } = await updateTicketStatus(ticket.id, 'closed');
    if (error) push('error', error); else { push('success', 'Ticket closed'); onBack(); }
  }

  return <div className="ticket-detail">
    <div className="ticket-detail-head">
      <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowRight size={14} className="rotate-180" /> Back</button>
      <div><h3>{ticket.subject}</h3><small>{ticket.user_name} · {ticket.user_email}</small></div>
      <div className="ticket-detail-actions">
        <StatusBadge status={ticket.status} />
        {ticket.status !== 'closed' && <button className="btn btn-ghost btn-sm" onClick={closeTicket}>Close ticket</button>}
      </div>
    </div>
    <div className="ticket-messages">
      {loading ? <LoadingSpinner /> : messages.length === 0 ? <EmptyState icon={<LifeBuoy />} title="No messages yet" message="Start the conversation." /> :
        messages.map(m => <div className={`ticket-msg ${m.is_admin_reply ? 'admin' : 'user'}`} key={m.id}>
          <div className="ticket-msg-head"><strong>{m.is_admin_reply ? 'Admin' : ticket.user_name}</strong><small>{formatDateTime(m.created_at)}</small></div>
          <p>{m.message}</p>
        </div>)}
    </div>
    {ticket.status !== 'closed' && <div className="ticket-reply">
      <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply…" rows={3} />
      <button className="btn btn-dark" onClick={sendReply} disabled={busy || !reply.trim()}><Send size={16} /> {busy ? 'Sending…' : 'Send reply'}</button>
    </div>}
  </div>;
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setNotifications(await fetchAdminNotifications()); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    const { error } = await sendPlatformNotification(title, message, type);
    if (error) push('error', error);
    else { push('success', 'Notification sent'); setTitle(''); setMessage(''); setShowForm(false); load(); }
    setBusy(false);
  }

  return <>
    <div className="filter-row"><button className="btn btn-dark" onClick={() => setShowForm(!showForm)}><Bell size={16} /> New announcement</button></div>
    {showForm && <div className="panel notification-form">
      <h3>Send platform announcement</h3>
      <div className="form-stack">
        <label className="field"><span>Title</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Platform maintenance" /></label>
        <label className="field"><span>Message</span><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Announcement details…" rows={3} /></label>
        <label className="field"><span>Type</span>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="announcement">Announcement</option><option value="general">General</option><option value="security">Security</option>
          </select>
        </label>
        <button className="btn btn-dark" onClick={send} disabled={busy || !title.trim() || !message.trim()}><Send size={16} /> {busy ? 'Sending…' : 'Send to all users'}</button>
      </div>
    </div>}
    {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={load} /> :
      notifications.length === 0 ? <EmptyState icon={<Bell />} title="No notifications" message="Platform notifications will appear here." /> :
      <div className="panel"><div className="admin-table">
        <div className="admin-table-head"><span>Title</span><span>Message</span><span>Type</span><span>Platform</span><span>Date</span></div>
        {notifications.map(n => <div className="admin-table-row" key={n.id}>
          <strong>{n.title}</strong>
          <span className="muted">{n.message.slice(0, 60)}{n.message.length > 60 ? '…' : ''}</span>
          <span>{n.type}</span>
          <span>{n.is_platform ? 'Yes' : 'No'}</span>
          <span className="muted">{formatDate(n.created_at)}</span>
        </div>)}
      </div></div>}
  </>;
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setLogs(await fetchAdminAuditLogs()); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (logs.length === 0) return <EmptyState icon={<FileText />} title="No audit logs" message="Admin actions will be recorded here." />;

  return <div className="panel"><div className="admin-table">
    <div className="admin-table-head"><span>Action</span><span>Target</span><span>Details</span><span>Timestamp</span></div>
    {logs.map(l => <div className="admin-table-row" key={l.id}>
      <strong>{l.action.replace(/_/g, ' ')}</strong>
      <span className="muted">{l.target_type ?? '—'}</span>
      <span className="muted">{Object.keys(l.details).length > 0 ? JSON.stringify(l.details).slice(0, 80) : '—'}</span>
      <span className="muted">{formatDateTime(l.created_at)}</span>
    </div>)}
  </div></div>;
}

export function AdminMarkets() {
  const [assets, setAssets] = useState<Array<{ id: string; symbol: string; name: string; asset_type: string; current_price: number; daily_change_pct: number; market_status: string; is_active: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('assets').select('*').order('name', { ascending: true });
    if (error) setError(error.message); else setAssets(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (assets.length === 0) return <EmptyState icon={<Globe2 />} title="No market instruments" message="Add assets for users to explore." />;

  return <div className="panel"><div className="admin-table">
    <div className="admin-table-head"><span>Symbol</span><span>Name</span><span>Type</span><span>Price</span><span>Change</span><span>Status</span></div>
    {assets.map(a => <div className="admin-table-row" key={a.id}>
      <strong>{a.symbol}</strong>
      <span>{a.name}</span>
      <span className="muted">{a.asset_type}</span>
      <span>{formatCurrency(a.current_price)}</span>
      <span className={a.daily_change_pct >= 0 ? 'positive' : 'negative'}>{a.daily_change_pct >= 0 ? '+' : ''}{a.daily_change_pct}%</span>
      <StatusBadge status={a.is_active ? 'active' : 'disabled'} />
    </div>)}
  </div></div>;
}

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<Array<{ id: string; referrer_email: string; referred_email: string; reward_amount: number; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.from('referrals').select(`
        id, reward_amount, status, created_at,
        referrer:profiles!referrals_referrer_id_fkey(email),
        referred:profiles!referrals_referred_id_fkey(email)
      `).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setReferrals((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, reward_amount: r.reward_amount as number, status: r.status as string, created_at: r.created_at as string,
        referrer_email: (r.referrer as Record<string, string>)?.email ?? '', referred_email: (r.referred as Record<string, string>)?.email ?? '',
      })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (referrals.length === 0) return <EmptyState icon={<UsersRound />} title="No referrals" message="Referral activity will appear here." />;

  return <div className="panel"><div className="admin-table">
    <div className="admin-table-head"><span>Referrer</span><span>Referred</span><span>Reward</span><span>Status</span><span>Date</span></div>
    {referrals.map(r => <div className="admin-table-row" key={r.id}>
      <span>{r.referrer_email}</span>
      <span>{r.referred_email}</span>
      <span>{formatCurrency(r.reward_amount)}</span>
      <StatusBadge status={r.status} />
      <span className="muted">{formatDate(r.created_at)}</span>
    </div>)}
  </div></div>;
}

export function AdminSiteSettings() {
  const [settings, setSettings] = useState<Array<{ key: string; value: Record<string, unknown>; description: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('site_settings').select('*').order('key');
    if (error) setError(error.message); else setSettings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSetting(key: string, value: Record<string, unknown>) {
    const { error } = await supabase.from('site_settings').update({ value }).eq('key', key);
    if (error) push('error', error.message); else push('success', 'Setting saved');
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return <div className="panel">
    <div className="panel-heading"><div><h3>Platform settings</h3><span className="muted">Manage operational configuration</span></div></div>
    {settings.length === 0 ? <EmptyState icon={<Settings2 />} title="No settings configured" message="Site settings will appear here." /> :
      <div className="settings-list">{settings.map(s => <div className="setting-row" key={s.key}>
        <div><strong>{s.key}</strong><small>{s.description ?? ''}</small></div>
        <code>{JSON.stringify(s.value)}</code>
        <button className="btn btn-ghost btn-sm" onClick={() => saveSetting(s.key, s.value)}>Saved</button>
      </div>)}</div>}
  </div>;
}

export { useToast, Toasts };
