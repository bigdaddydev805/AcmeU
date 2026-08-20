import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { BookOpen, Clock, Trash2 } from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDate, formatDuration, formatPercent, titleCase } from '../lib/format';
import type { EnrollmentListItem, Envelope } from '../lib/types';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export default function MyLearning() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => getJson<Envelope<EnrollmentListItem>>('/enrollments'),
  });

  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) => api.delete(`/enrollments/${enrollmentId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment removed');
    },
    onError: (err) => toast.error('Could not remove the enrollment', errorMessage(err)),
  });

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    if (filter === 'completed') return all.filter((row) => row.completed_at || row.progress_pct >= 100);
    if (filter === 'active') return all.filter((row) => !row.completed_at && row.status === 'active');
    return all;
  }, [data, filter]);

  return (
    <>
      <PageHeader title="My learning" description="Every course you are enrolled in." />

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-fit">
        {FILTERS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setFilter(entry.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              filter === entry.value
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorState description={errorMessage(error)} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-44 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No enrollments in this view"
          description="Browse the catalog to find a course to start."
          icon={<BookOpen className="h-5 w-5" />}
          action={
            <Link to="/catalog">
              <Button>Explore the catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((enrollment) => (
            <Card key={enrollment.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/catalog/${enrollment.course_id}`}
                      className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                    >
                      {enrollment.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {enrollment.code}
                    </p>
                  </div>
                  <StatusBadge status={enrollment.status} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="accent">{titleCase(enrollment.category)}</Badge>
                  <Badge tone="neutral">{titleCase(enrollment.level)}</Badge>
                </div>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(enrollment.duration_mins)}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatPercent(enrollment.progress_pct)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, enrollment.progress_pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      {enrollment.completed_at
                        ? `Completed ${formatDate(enrollment.completed_at)}`
                        : `Enrolled ${formatDate(enrollment.enrolled_at)}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      loading={unenroll.isPending && unenroll.variables === enrollment.id}
                      onClick={() => unenroll.mutate(enrollment.id)}
                    >
                      Leave
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
