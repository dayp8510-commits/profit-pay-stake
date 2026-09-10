import type { Asset, Plan, Transaction } from './types';

export const demoAssets: Asset[] = [
  { id: 'btc', symbol: 'BTC/USD', name: 'Bitcoin', asset_type: 'crypto', current_price: 68240.12, daily_change_pct: 2.84, market_status: 'open' },
  { id: 'eth', symbol: 'ETH/USD', name: 'Ethereum', asset_type: 'crypto', current_price: 3512.64, daily_change_pct: 1.42, market_status: 'open' },
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', current_price: 213.07, daily_change_pct: -0.38, market_status: 'open' },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corp.', asset_type: 'stock', current_price: 127.88, daily_change_pct: 3.16, market_status: 'open' },
  { id: 'eur', symbol: 'EUR/USD', name: 'Euro / US Dollar', asset_type: 'forex', current_price: 1.0842, daily_change_pct: -0.12, market_status: 'open' },
  { id: 'spx', symbol: 'SPX', name: 'S&P 500 Index', asset_type: 'index', current_price: 5447.87, daily_change_pct: 0.76, market_status: 'open' },
  { id: 'gold', symbol: 'XAU/USD', name: 'Gold', asset_type: 'commodity', current_price: 2328.4, daily_change_pct: 0.41, market_status: 'open' },
];

export const demoPlans: Plan[] = [
  { id: 'core', name: 'Core allocation', description: 'A measured approach built around diversified exposure and a steady investing horizon.', min_amount: 250, max_amount: 25000, duration_days: 90, fee_pct: 0.75, risk_level: 'low', status: 'active' },
  { id: 'growth', name: 'Growth focus', description: 'Broader market access for investors comfortable with more day-to-day movement.', min_amount: 1000, max_amount: 100000, duration_days: 180, fee_pct: 1.1, risk_level: 'medium', status: 'active' },
  { id: 'opportunity', name: 'Opportunity basket', description: 'Concentrated exposure to emerging themes with a higher potential for volatility.', min_amount: 2500, max_amount: 250000, duration_days: 365, fee_pct: 1.45, risk_level: 'high', status: 'active' },
];

export const demoTransactions: Transaction[] = [
  { id: '1', transaction_id: 'TXN-A82F91', type: 'deposit', amount: 12500, currency: 'USD', status: 'completed', description: 'Bank transfer', created_at: '2025-02-12T14:20:00Z' },
  { id: '2', transaction_id: 'TXN-B71C44', type: 'investment', amount: 5000, currency: 'USD', status: 'completed', description: 'Core allocation', created_at: '2025-02-14T09:12:00Z' },
  { id: '3', transaction_id: 'TXN-C39D18', type: 'fee', amount: -37.5, currency: 'USD', status: 'completed', description: 'Management fee', created_at: '2025-03-01T08:00:00Z' },
  { id: '4', transaction_id: 'TXN-D52K80', type: 'deposit', amount: 2500, currency: 'USD', status: 'pending', description: 'Wire transfer', created_at: '2025-03-04T16:48:00Z' },
  { id: '5', transaction_id: 'TXN-E27M16', type: 'withdrawal', amount: -600, currency: 'USD', status: 'completed', description: 'Personal account', created_at: '2025-03-02T11:25:00Z' },
];

export const chartData = [
  { month: 'Oct', value: 18200 }, { month: 'Nov', value: 19750 }, { month: 'Dec', value: 19120 },
  { month: 'Jan', value: 22200 }, { month: 'Feb', value: 24100 }, { month: 'Mar', value: 27640 },
];
