import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral:
    'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  danger:
    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  accent:
    'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  published: 'success',
  paid: 'success',
  graded: 'success',
  completed: 'success',
  connected: 'success',
  invited: 'info',
  submitted: 'info',
  pending: 'warning',
  draft: 'warning',
  queued: 'warning',
  returned: 'warning',
  disabled: 'danger',
  failed: 'danger',
  refunded: 'danger',
  archived: 'neutral',
};

export function toneForStatus(status: string | null | undefined): BadgeTone {
  if (!status) return 'neutral';
  return STATUS_TONES[status.toLowerCase()] ?? 'neutral';
}

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, tone = 'neutral', className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <Badge tone={toneForStatus(status)} dot className={className}>
      {status ?? 'unknown'}
    </Badge>
  );
}
