import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value);
  return isValid(date) ? date : null;
}

export function formatDate(value: string | number | Date | null | undefined, fallback = '—'): string {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy') : fallback;
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy, HH:mm') : fallback;
}

export function formatTimeAgo(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const date = toDate(value);
  if (!date) return fallback;
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function formatMonthKey(key: string): string {
  const date = toDate(`${key}-01T00:00:00Z`);
  return date ? format(date, 'MMM yyyy') : key;
}

export function formatCurrency(cents: number | null | undefined, currency = 'USD'): string {
  const amount = (cents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 0): string {
  return `${(value ?? 0).toFixed(fractionDigits)}%`;
}

export function formatDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(minutes ?? 0));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatBytes(bytes: number | null | undefined): string {
  const value = bytes ?? 0;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let index = -1;
  let size = value;
  do {
    size /= 1024;
    index += 1;
  } while (size >= 1024 && index < units.length - 1);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function truncate(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function safeJson(value: unknown, spaces = 2): string {
  try {
    return JSON.stringify(value, null, spaces) ?? '';
  } catch {
    return String(value);
  }
}
