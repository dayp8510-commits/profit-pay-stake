export type UserRole = 'user' | 'admin';
export type PlanRisk = 'low' | 'medium' | 'high' | 'very_high';
export type IconName = 'LayoutDashboard' | 'ChartNoAxesCombined' | 'Globe2' | 'Layers3' | 'ArrowDownToLine' | 'ArrowUpFromLine' | 'ReceiptText' | 'UsersRound' | 'UserRound' | 'ShieldCheck' | 'LifeBuoy' | 'LogOut' | 'Settings2' | 'FileText' | 'Bell' | 'ChevronRight' | 'ChevronDown' | 'Menu' | 'X' | 'Sun' | 'Moon';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  is_demo: boolean;
  is_verified: boolean;
  is_suspended: boolean;
  referral_code: string | null;
  available_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  portfolio_value: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  asset_type: 'crypto' | 'stock' | 'forex' | 'index' | 'commodity';
  current_price: number;
  daily_change_pct: number;
  market_status: 'open' | 'closed' | 'premarket' | 'afterhours';
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number;
  duration_days: number;
  fee_pct: number;
  risk_level: PlanRisk;
  status: 'active' | 'disabled';
}

export interface Transaction {
  id: string;
  transaction_id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'return' | 'fee' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description: string;
  created_at: string;
}

export interface NavItem { label: string; path: string; icon: IconName; }
