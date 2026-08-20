import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  delta?: number | null;
  loading?: boolean;
  className?: string;
}

export function StatTile({ label, value, hint, icon, delta, loading, className }: StatTileProps) {
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-popover dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <div className="skeleton h-7 w-24" />
        ) : (
          <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
        )}
        {delta !== undefined && delta !== null && !loading ? (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
