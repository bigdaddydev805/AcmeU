import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardHeader } from './Card';
import { ErrorState } from './EmptyState';
import { Checkbox, Input } from './Input';
import { Modal } from './Modal';
import { Table, type Column } from './Table';
import { useToast } from './Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import type { ApiKey, Envelope } from '../lib/types';

const SCOPES = [
  'catalog:read',
  'catalog:write',
  'roster:read',
  'roster:write',
  'enrollment:read',
  'enrollment:write',
  'assessment:read',
  'assessment:write',
  'reports:read',
  'billing:read',
  'billing:write',
  'admin:all',
];

export interface ApiKeysPanelProps {
  title?: string;
  description?: string;
}

export function ApiKeysPanel({
  title = 'API keys',
  description = 'Service credentials for integrations that call the AcmeU API.',
}: ApiKeysPanelProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<string[]>(['catalog:read']);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => getJson<Envelope<ApiKey>>('/admin/api-keys'),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiKey>('/admin/api-keys', {
        label,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreating(false);
      setLabel('');
      setExpiresAt('');
      setScopes(['catalog:read']);
      setIssuedKey(data.key ?? null);
    },
    onError: (error) => toast.error('Could not create the key', errorMessage(error)),
  });

  const rotate = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ key: string }>(`/admin/api-keys/${id}/rotate`);
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setIssuedKey(data.key);
    },
    onError: (error) => toast.error('Could not rotate the key', errorMessage(error)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/api-keys/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Key revoked');
    },
    onError: (error) => toast.error('Could not revoke the key', errorMessage(error)),
  });

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed', 'Select the value and copy it manually.');
    }
  };

  const columns: Array<Column<ApiKey>> = [
    {
      key: 'label',
      header: 'Label',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{row.label}</p>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.key_prefix}…</p>
        </div>
      ),
    },
    {
      key: 'scopes',
      header: 'Scopes',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.scopes ?? []).map((scope) => (
            <Badge key={scope} tone="neutral">
              {scope}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'used',
      header: 'Last used',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.last_used_at ? formatDateTime(row.last_used_at) : 'Never'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.revoked_at ? (
          <Badge tone="danger">Revoked</Badge>
        ) : row.expires_at ? (
          <Badge tone="warning">Expires {formatDate(row.expires_at)}</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        ),
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
            icon={<RefreshCcw className="h-3.5 w-3.5" />}
            disabled={Boolean(row.revoked_at)}
            loading={rotate.isPending && rotate.variables === row.id}
            onClick={() => rotate.mutate(row.id)}
          >
            Rotate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            disabled={Boolean(row.revoked_at)}
            loading={revoke.isPending && revoke.variables === row.id}
            onClick={() => revoke.mutate(row.id)}
          >
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New key
          </Button>
        }
      />
      <CardContent className="p-0">
        {keys.isError ? (
          <div className="p-5">
            <ErrorState title="Keys unavailable" description={errorMessage(keys.error)} />
          </div>
        ) : (
          <Table
            className="rounded-none border-0 shadow-none"
            columns={columns}
            rows={keys.data?.data ?? []}
            rowKey={(row) => row.id}
            loading={keys.isLoading}
            emptyTitle="No API keys"
            emptyDescription="Create a key to let an integration authenticate against the API."
          />
        )}
      </CardContent>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create API key"
        description="The secret is shown once. Store it in your secret manager."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              loading={create.isPending}
              disabled={!label.trim() || scopes.length === 0}
              onClick={() => create.mutate()}
            >
              Create key
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
            placeholder="Roster sync worker"
          />
          <Input
            label="Expires"
            type="datetime-local"
            hint="Leave empty for a key that does not expire."
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Scopes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCOPES.map((scope) => (
                <Checkbox
                  key={scope}
                  label={<span className="font-mono text-xs">{scope}</span>}
                  checked={scopes.includes(scope)}
                  onChange={(event) =>
                    setScopes((current) =>
                      event.target.checked
                        ? [...current, scope]
                        : current.filter((entry) => entry !== scope),
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(issuedKey)}
        onClose={() => setIssuedKey(null)}
        title="Copy your API key"
        description="This is the only time the full key is displayed."
        footer={
          <Button onClick={() => setIssuedKey(null)}>Done</Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-slate-800 dark:text-slate-200">
            {issuedKey}
          </code>
          <Button
            variant="outline"
            size="sm"
            icon={<Copy className="h-3.5 w-3.5" />}
            onClick={() => issuedKey && copyKey(issuedKey)}
          >
            Copy
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
