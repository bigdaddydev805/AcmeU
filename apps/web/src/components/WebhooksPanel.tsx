import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Plus, Send, Webhook as WebhookIcon } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardHeader } from './Card';
import { ErrorState } from './EmptyState';
import { Checkbox, Input } from './Input';
import { Modal } from './Modal';
import { Table, type Column } from './Table';
import { useToast } from './Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDateTime, formatTimeAgo, safeJson } from '../lib/format';
import type { Envelope, Webhook, WebhookDelivery, WebhookTestResult } from '../lib/types';

const EVENTS = [
  'enrollment.created',
  'enrollment.completed',
  'submission.submitted',
  'submission.graded',
  'certificate.issued',
  'course.published',
  'user.invited',
  'order.paid',
];

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : safeJson(value);
}

function CreateWebhookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['enrollment.created']);
  const [active, setActive] = useState(true);

  const create = useMutation({
    mutationFn: () => api.post('/integrations/webhooks', { label, targetUrl, events, active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook created', label);
      setLabel('');
      setTargetUrl('');
      setEvents(['enrollment.created']);
      onClose();
    },
    onError: (error) => toast.error('Could not create the webhook', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New webhook"
      description="AcmeU signs every delivery with the endpoint secret."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!label.trim() || !targetUrl.trim() || events.length === 0}
            onClick={() => create.mutate()}
          >
            Create webhook
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Label"
          required
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="HRIS sync"
        />
        <Input
          label="Target URL"
          required
          type="url"
          value={targetUrl}
          onChange={(event) => setTargetUrl(event.target.value)}
          placeholder="https://hooks.example.com/acmeu"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Events</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENTS.map((event) => (
              <Checkbox
                key={event}
                label={<span className="font-mono text-xs">{event}</span>}
                checked={events.includes(event)}
                onChange={(changed) =>
                  setEvents((current) =>
                    changed.target.checked
                      ? [...current, event]
                      : current.filter((entry) => entry !== event),
                  )
                }
              />
            ))}
          </div>
        </div>
        <Checkbox
          label="Deliver events immediately"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
      </div>
    </Modal>
  );
}

function DeliveriesModal({ webhook, onClose }: { webhook: Webhook | null; onClose: () => void }) {
  const deliveries = useQuery({
    queryKey: ['webhook-deliveries', webhook?.id],
    queryFn: () => getJson<Envelope<WebhookDelivery>>(`/integrations/webhooks/${webhook?.id}/deliveries`),
    enabled: Boolean(webhook),
  });

  return (
    <Modal
      open={Boolean(webhook)}
      onClose={onClose}
      title={`Deliveries — ${webhook?.label ?? ''}`}
      description="The 100 most recent delivery attempts."
      size="xl"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Table
        columns={[
          {
            key: 'event',
            header: 'Event',
            render: (row: WebhookDelivery) => <span className="font-mono text-xs">{row.event}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row: WebhookDelivery) => (
              <Badge tone={row.response_status && row.response_status < 400 ? 'success' : 'danger'}>
                {row.response_status ?? 'error'}
              </Badge>
            ),
          },
          {
            key: 'duration',
            header: 'Duration',
            align: 'right',
            render: (row: WebhookDelivery) => (row.duration_ms ? `${row.duration_ms} ms` : '—'),
          },
          {
            key: 'created',
            header: 'When',
            render: (row: WebhookDelivery) => formatDateTime(row.created_at),
          },
        ]}
        rows={deliveries.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={deliveries.isLoading}
        emptyTitle="No deliveries yet"
      />
    </Modal>
  );
}

export function WebhooksPanel() {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [deliveriesFor, setDeliveriesFor] = useState<Webhook | null>(null);
  const [testResult, setTestResult] = useState<{ webhook: Webhook; result: WebhookTestResult } | null>(
    null,
  );

  const webhooks = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => getJson<Envelope<Webhook>>('/integrations/webhooks'),
  });

  const sendTest = useMutation({
    mutationFn: async (webhook: Webhook) => {
      const { data } = await api.post<WebhookTestResult>(
        `/integrations/webhooks/${webhook.id}/test`,
        { data: { sample: true } },
      );
      return { webhook, result: data };
    },
    onSuccess: (payload) => setTestResult(payload),
    onError: (error) => toast.error('Test delivery failed', errorMessage(error)),
  });

  const columns: Array<Column<Webhook>> = [
    {
      key: 'label',
      header: 'Endpoint',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{row.label}</p>
          <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
            {row.target_url}
          </p>
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.events ?? []).slice(0, 3).map((event) => (
            <Badge key={event} tone="neutral">
              {event}
            </Badge>
          ))}
          {(row.events ?? []).length > 3 ? (
            <Badge tone="neutral">+{row.events.length - 3}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Last delivery',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.last_status ? (
            <Badge tone={row.last_status < 400 ? 'success' : 'danger'}>{row.last_status}</Badge>
          ) : (
            <Badge tone="neutral">Never</Badge>
          )}
          {row.last_fired_at ? (
            <span className="text-xs text-slate-400">{formatTimeAgo(row.last_fired_at)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'State',
      render: (row) =>
        row.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Paused</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<History className="h-3.5 w-3.5" />}
            onClick={() => setDeliveriesFor(row)}
          >
            Deliveries
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            loading={sendTest.isPending && sendTest.variables?.id === row.id}
            onClick={() => sendTest.mutate(row)}
          >
            Send test event
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Webhooks"
        description="Receive AcmeU events in your own systems."
        action={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New webhook
          </Button>
        }
      />
      <CardContent className="p-0">
        {webhooks.isError ? (
          <div className="p-5">
            <ErrorState title="Webhooks unavailable" description={errorMessage(webhooks.error)} />
          </div>
        ) : (
          <Table
            className="rounded-none border-0 shadow-none"
            columns={columns}
            rows={webhooks.data?.data ?? []}
            rowKey={(row) => row.id}
            loading={webhooks.isLoading}
            emptyTitle="No webhooks configured"
            emptyDescription="Create an endpoint to start receiving events."
            emptyIcon={<WebhookIcon className="h-5 w-5" />}
          />
        )}
      </CardContent>

      <CreateWebhookModal open={creating} onClose={() => setCreating(false)} />
      <DeliveriesModal webhook={deliveriesFor} onClose={() => setDeliveriesFor(null)} />

      <Modal
        open={Boolean(testResult)}
        onClose={() => setTestResult(null)}
        title="Test delivery result"
        description={testResult ? `${testResult.webhook.label} · ${testResult.result.durationMs} ms` : undefined}
        size="xl"
        footer={<Button onClick={() => setTestResult(null)}>Close</Button>}
      >
        {testResult ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={testResult.result.status < 400 ? 'success' : 'danger'}>
                HTTP {testResult.result.status}
              </Badge>
              <Badge tone="neutral">{testResult.result.durationMs} ms</Badge>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {testResult.webhook.target_url}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Response headers
              </p>
              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                {safeJson(testResult.result.headers)}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Response body
              </p>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                {asText(testResult.result.body)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
