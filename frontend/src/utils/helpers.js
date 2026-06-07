import { format, formatDistanceToNow, parseISO } from 'date-fns';

// ─── Date Formatting ──────────────────────────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00'), 'dd MMM yyyy');
  } catch { return dateStr; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch { return dateStr; }
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch { return dateStr; }
};

export const todayISO = () => new Date().toISOString().split('T')[0];

// ─── Currency Formatting ──────────────────────────────────────────────────────
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// ─── Status Helpers ───────────────────────────────────────────────────────────
export const getStatusLabel = (status) => status === 'completed' ? 'Completed' : 'In Progress';

export const getPriorityColor = (priority) => {
  const map = { Low: 'var(--success)', Medium: 'var(--warning)', High: 'var(--danger)', Urgent: '#dc2626' };
  return map[priority] || 'var(--text-secondary)';
};

export const getStatusColor = (status) =>
  status === 'completed' ? 'var(--success)' : 'var(--warning)';

// ─── Time Options ─────────────────────────────────────────────────────────────
export const TIME_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];
export const WORK_TYPES   = ['Accounts', 'TDS', 'GST', 'Income Tax', 'Miscellaneous'];
export const PRIORITIES   = ['Low', 'Medium', 'High', 'Urgent'];
export const STATUSES     = [{ value: 'in_progress', label: 'Work in Progress' }, { value: 'completed', label: 'Completed' }];

// ─── Extract error message from Axios error ────────────────────────────────────
export const getErrorMessage = (err) =>
  err?.response?.data?.error || err?.message || 'Something went wrong.';

// ─── Truncate long text ───────────────────────────────────────────────────────
export const truncate = (text, maxLen = 40) => {
  if (!text) return '—';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};
