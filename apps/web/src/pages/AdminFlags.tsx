import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Flag, SlidersHorizontal } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { SkeletonCard } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDateTime, safeJson } from '../lib/format';
import type { Envelope, FeatureFlag } from '../lib/types';

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700',
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white transition',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function AdminFlags() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [rolloutDraft, setRolloutDraft] = useState('{}');
  const [rolloutError, setRolloutError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setRolloutDraft(safeJson(editing.rollout ?? {}));
      setRolloutError(null);
    }
  }, [editing]);

  const flags = useQuery({
    queryKey: ['admin', 'flags'],
    queryFn: () => getJson<Envelope<FeatureFlag>>('/admin/flags'),
  });

  const update = useMutation({
    mutationFn: ({
      key,
      enabled,
      rollout,
    }: {
      key: string;
      enabled: boolean;
      rollout?: Record<string, unknown>;
    }) => api.put(`/admin/flags/${key}`, { enabled, rollout }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'flags'] });
      toast.success('Flag updated');
    },
    onError: (error) => toast.error('Could not update the flag', errorMessage(error)),
  });

  const saveRollout = () => {
    if (!editing) return;
    try {
      const parsed = JSON.parse(rolloutDraft) as Record<string, unknown>;
      setRolloutError(null);
      update.mutate(
        { key: editing.key, enabled: editing.enabled, rollout: parsed },
        { onSuccess: () => setEditing(null) },
      );
    } catch (error) {
      setRolloutError((error as Error).message);
    }
  };

  const rows = flags.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Roll features out gradually across the platform."
      />

      {flags.isError ? (
        <ErrorState title="Flags unavailable" description={errorMessage(flags.error)} />
      ) : flags.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={2} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No feature flags"
          description="Flags defined by the platform will appear here."
          icon={<Flag className="h-5 w-5" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((flag) => (
            <Card key={flag.key}>
              <CardHeader
                title={<span className="font-mono text-sm">{flag.key}</span>}
                description={flag.description || 'No description provided.'}
                action={
                  <Toggle
                    label={`Toggle ${flag.key}`}
                    checked={flag.enabled}
                    disabled={update.isPending}
                    onChange={(value) =>
                      update.mutate({ key: flag.key, enabled: value, rollout: flag.rollout })
                    }
                  />
                }
              />
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={flag.enabled ? 'success' : 'neutral'} dot>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Updated {formatDateTime(flag.updated_at)}
                  </span>
                </div>
                <pre className="max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {safeJson(flag.rollout ?? {})}
                </pre>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                    onClick={() => setEditing(flag)}
                  >
                    Edit rollout
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Rollout for ${editing?.key ?? ''}`}
        description="Targeting rules are stored as JSON, for example percentage or tenant allow lists."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={saveRollout}>
              Save rollout
            </Button>
          </>
        }
      >
        <Textarea
          label="Rollout"
          monospace
          rows={10}
          value={rolloutDraft}
          error={rolloutError}
          onChange={(event) => setRolloutDraft(event.target.value)}
        />
      </Modal>
    </>
  );
}
