import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import clsx from 'clsx';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Checkbox, Textarea } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatTimeAgo, titleCase } from '../lib/format';
import type { Notification, NotificationsResponse } from '../lib/types';

const SEVERITY_TONES: Record<string, 'neutral' | 'info' | 'warning' | 'danger'> = {
  info: 'info',
  normal: 'neutral',
  warning: 'warning',
  critical: 'danger',
};

function NotificationBody({ body }: { body: string }) {
  const html = useMemo(() => DOMPurify.sanitize(body), [body]);
  return (
    <p
      className="mt-1 text-sm text-slate-600 dark:text-slate-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pageSize, setPageSize] = useState('25');
  const [filterText, setFilterText] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const params = useMemo(() => {
    const query: Record<string, string> = { pageSize };
    if (unreadOnly) query.unreadOnly = 'true';
    if (appliedFilter.trim()) query.filter = appliedFilter;
    return query;
  }, [pageSize, unreadOnly, appliedFilter]);

  const notifications = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => getJson<NotificationsResponse>('/notifications', { params }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => toast.error('Could not update the notification', errorMessage(error)),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => toast.error('Could not update notifications', errorMessage(error)),
  });

  const applyFilter = () => {
    if (!filterText.trim()) {
      setFilterError(null);
      setAppliedFilter('');
      return;
    }
    try {
      JSON.parse(filterText);
      setFilterError(null);
      setAppliedFilter(filterText);
    } catch (error) {
      setFilterError((error as Error).message);
    }
  };

  const rows = notifications.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Activity from your courses, submissions, and workspace."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilter((value) => !value)}
            >
              Advanced filter
            </Button>
            <Button
              icon={<CheckCheck className="h-4 w-4" />}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader
          title="View"
          description={
            notifications.data ? `${notifications.data.unread} unread` : 'Loading notifications…'
          }
          action={
            <Badge tone={notifications.data?.unread ? 'accent' : 'neutral'}>
              {notifications.data?.unread ?? 0} unread
            </Badge>
          }
        />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <Checkbox
              className="pb-2"
              label="Unread only"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            <Select
              containerClassName="w-40"
              label="Page size"
              options={['10', '25', '50', '100'].map((value) => ({ value, label: value }))}
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
            />
          </div>

          {showFilter ? (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Textarea
                label="Filter"
                hint='JSON object of column filters, for example {"kind":"submission.graded","severity":"info"}.'
                monospace
                rows={4}
                value={filterText}
                error={filterError}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder='{"kind":"course.published"}'
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterText('');
                    setAppliedFilter('');
                    setFilterError(null);
                  }}
                >
                  Clear
                </Button>
                <Button onClick={applyFilter}>Apply filter</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {notifications.isError ? (
        <ErrorState title="Notifications unavailable" description={errorMessage(notifications.error)} />
      ) : notifications.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="You are all caught up"
          description="New activity from your courses will appear here."
          icon={<Bell className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={clsx(
                'transition',
                !notification.read_at && 'border-indigo-200 dark:border-indigo-500/40',
              )}
            >
              <CardContent className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </p>
                    <Badge tone={SEVERITY_TONES[notification.severity] ?? 'neutral'}>
                      {titleCase(notification.severity)}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {titleCase(notification.kind)} · {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <NotificationBody body={notification.body} />
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>

                {!notification.read_at ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={markRead.isPending && markRead.variables === notification.id}
                    onClick={() => markRead.mutate(notification.id)}
                  >
                    Mark read
                  </Button>
                ) : (
                  <Badge tone="neutral">Read</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
