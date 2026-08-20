import clsx from 'clsx';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZES = {
  sm: 'h-4 w-4 border',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-2',
};

export function Spinner({ className, size = 'md', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        'inline-block animate-spin rounded-full border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400',
        SIZES[size],
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center gap-3 py-12 text-sm text-slate-500 dark:text-slate-400', className)}>
      <Spinner size="sm" />
      {label}
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={clsx('skeleton h-4 w-full', className)} />;
}

export function SkeletonCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={clsx(
        'space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <SkeletonLine className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} className={index === rows - 1 ? 'w-2/3' : undefined} />
      ))}
    </div>
  );
}
