import type { ReactNode } from 'react';
import clsx from 'clsx';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface TableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGNMENT = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  className,
}: TableProps<T>) {
  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={clsx(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
                    ALIGNMENT[column.align ?? 'left'],
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading
              ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        <div className="skeleton h-4 w-full max-w-[180px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, index) => (
                  <tr
                    key={rowKey(row, index)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={clsx(
                      'transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={clsx(
                          'px-4 py-3 text-slate-700 dark:text-slate-300',
                          ALIGNMENT[column.align ?? 'left'],
                          column.className,
                        )}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
