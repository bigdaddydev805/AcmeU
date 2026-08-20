import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { errorMessage, getJson } from '../lib/api';
import { formatDateTime, safeJson } from '../lib/format';
import type { AuditLogEntry, Envelope } from '../lib/types';

function toneForAction(action: string) {
  if (action.includes('deleted') || action.includes('revoked') || action.includes('disabled')) {
    return 'danger' as const;
  }
  if (action.startsWith('admin.') || action.includes('impersonation')) return 'warning' as const;
  if (action.includes('created') || action.includes('issued')) return 'success' as const;
  return 'neutral' as const;
}

export default function AdminAuditLog() {
  const [limit, setLimit] = useState('100');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const audit = useQuery({
    queryKey: ['admin', 'audit', limit],
    queryFn: () => getJson<Envelope<AuditLogEntry>>('/admin/audit', { params: { limit } }),
  });

  const rows = useMemo(() => {
    const entries = audit.data?.data ?? [];
    const needle = term.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.action, entry.actor_label, entry.target_type, entry.target_id, entry.ip_address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [audit.data, term]);

  const columns: Array<Column<AuditLogEntry>> = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => <Badge tone={toneForAction(row.action)}>{row.action}</Badge>,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{row.actor_label ?? 'system'}</span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (row) =>
        row.target_type ? (
          <div className="min-w-0">
            <p className="text-sm text-slate-700 dark:text-slate-300">{row.target_type}</p>
            <p className="truncate font-mono text-xs text-slate-400">{row.target_id}</p>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'ip',
      header: 'IP address',
      render: (row) => <span className="font-mono text-xs">{row.ip_address ?? '—'}</span>,
    },
    {
      key: 'created',
      header: 'When',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every privileged action taken in this workspace."
      />

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              containerClassName="min-w-[240px] flex-1"
              label="Filter"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Filter by action, actor, target, or IP"
            />
            <Select
              containerClassName="w-40"
              label="Entries"
              options={['50', '100', '250', '500'].map((value) => ({ value, label: value }))}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {audit.isError ? (
        <ErrorState title="Audit log unavailable" description={errorMessage(audit.error)} />
      ) : (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          loading={audit.isLoading}
          emptyTitle="No audit entries"
          emptyDescription="Privileged actions will appear here as they happen."
          emptyIcon={<ScrollText className="h-5 w-5" />}
        />
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.action ?? 'Audit entry'}
        description={selected ? formatDateTime(selected.created_at) : undefined}
        size="lg"
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      >
        <div className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</p>
              <p className="text-slate-800 dark:text-slate-200">{selected?.actor_label ?? 'system'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IP address</p>
              <p className="font-mono text-xs text-slate-800 dark:text-slate-200">
                {selected?.ip_address ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
              <p className="text-slate-800 dark:text-slate-200">
                {selected?.target_type ?? '—'}{' '}
                <span className="font-mono text-xs text-slate-400">{selected?.target_id}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entry</p>
              <p className="font-mono text-xs text-slate-800 dark:text-slate-200">{selected?.id}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
              {safeJson(selected?.metadata ?? {})}
            </pre>
          </div>
        </div>
      </Modal>
    </>
  );
}
