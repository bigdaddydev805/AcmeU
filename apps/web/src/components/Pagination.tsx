import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../lib/format';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageWindow(current: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (totalPages <= 1) return null;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={clsx('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{formatNumber(first)}</span>
        {'–'}
        <span className="font-medium text-slate-700 dark:text-slate-200">{formatNumber(last)}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((entry, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && entry - previous > 1;
          return (
            <span key={entry} className="flex items-center gap-1">
              {gap ? <span className="px-1 text-xs text-slate-400">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={clsx(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition',
                  entry === page
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {entry}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
