import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, FileUp, Link2, Plug, Upload, Users } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardFooter, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { WebhooksPanel } from '../components/WebhooksPanel';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDate, formatNumber, safeJson, titleCase } from '../lib/format';
import type {
  Envelope,
  Integration,
  LinkPreview,
  PackageImportResult,
  RosterImportResult,
} from '../lib/types';

function LinkPreviewTool() {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<LinkPreview | null>(null);

  const fetchPreview = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<LinkPreview>('/integrations/link-preview', { url });
      return data;
    },
    onSuccess: (data) => setPreview(data),
    onError: (error) => toast.error('Could not fetch the link', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Link preview"
        description="Resolve a URL into a title, description, and image before adding it to a lesson."
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            containerClassName="min-w-[260px] flex-1"
            label="URL"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://docs.example.com/security-briefing"
            leadingIcon={<Link2 className="h-4 w-4" />}
          />
          <Button
            loading={fetchPreview.isPending}
            disabled={!url.trim()}
            onClick={() => fetchPreview.mutate()}
          >
            Fetch preview
          </Button>
        </div>

        {preview ? (
          <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            {preview.image ? (
              <img
                src={preview.image}
                alt=""
                className="h-28 w-40 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-28 w-40 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Link2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={preview.status < 400 ? 'success' : 'danger'}>HTTP {preview.status}</Badge>
                {preview.contentType ? <Badge tone="neutral">{preview.contentType}</Badge> : null}
                <Badge tone="neutral">{formatNumber(preview.bytes)} bytes</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {preview.title ?? 'Untitled document'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {preview.description ?? 'No description was found for this page.'}
              </p>
              <p className="truncate font-mono text-xs text-slate-400">{preview.url}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RosterImportTool() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState('');
  const [result, setResult] = useState<RosterImportResult | null>(null);

  const importRoster = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('roster', file);
      if (provider) form.append('provider', provider);
      const { data } = await api.post<RosterImportResult>('/integrations/roster/import', form);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Roster imported', `${data.created} accounts created`);
    },
    onError: (error) => toast.error('Import failed', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Roster import"
        description="Upload an XML or CSV roster export from your HR or student information system."
      />
      <CardContent className="space-y-4">
        <Input
          label="Provider"
          hint="Optional. Applies the field mapping configured for a connected provider."
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          placeholder="workday"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.csv,text/xml,text/csv,application/xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importRoster.mutate(file);
            event.target.value = '';
          }}
        />
        <Button
          variant="outline"
          icon={<Upload className="h-4 w-4" />}
          loading={importRoster.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Choose roster file
        </Button>

        {result ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{formatNumber(result.parsed)} parsed</Badge>
              <Badge tone="success">{formatNumber(result.created)} created</Badge>
              <Badge tone="neutral">{formatNumber(result.skipped.length)} skipped</Badge>
            </div>
            {result.skipped.length ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already in this workspace: {result.skipped.slice(0, 12).join(', ')}
                {result.skipped.length > 12 ? '…' : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          New accounts are created in the invited state and receive an email invitation.
        </span>
      </CardFooter>
    </Card>
  );
}

function CoursePackageTool() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<PackageImportResult | null>(null);

  const uploadPackage = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('package', file);
      const { data } = await api.post<PackageImportResult>('/integrations/courses/package', form);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Package imported', `${data.extracted} files extracted`);
    },
    onError: (error) => toast.error('Package import failed', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Course package"
        description="Import a packaged course archive exported from another authoring tool."
      />
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadPackage.mutate(file);
            event.target.value = '';
          }}
        />
        <Button
          variant="outline"
          icon={<FileUp className="h-4 w-4" />}
          loading={uploadPackage.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Upload .zip package
        </Button>

        {result ? (
          <div className="space-y-2">
            <Badge tone="success">{formatNumber(result.extracted)} files extracted</Badge>
            <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              {result.files.join('\n')}
            </pre>
            {result.manifest ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manifest</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {safeJson(result.manifest)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [provider, setProvider] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [manifestUrl, setManifestUrl] = useState('');
  const [credentials, setCredentials] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [configError, setConfigError] = useState<string | null>(null);

  const connect = useMutation({
    mutationFn: () =>
      api.post('/integrations/connect', {
        provider,
        displayName,
        manifestUrl: manifestUrl || undefined,
        credentials: credentials || undefined,
        config: JSON.parse(configText),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration connected', displayName);
      onClose();
    },
    onError: (error) => toast.error('Could not connect', errorMessage(error)),
  });

  const submit = () => {
    try {
      JSON.parse(configText);
      setConfigError(null);
      connect.mutate();
    } catch (error) {
      setConfigError((error as Error).message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect an integration"
      description="Register a provider so AcmeU can exchange data with it."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={connect.isPending}
            disabled={!provider.trim() || !displayName.trim()}
            onClick={submit}
          >
            Connect
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Provider"
            required
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="workday"
          />
          <Input
            label="Display name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Workday HRIS"
          />
        </div>
        <Input
          label="Manifest URL"
          type="url"
          hint="Optional. Used to resolve the provider's field mapping."
          value={manifestUrl}
          onChange={(event) => setManifestUrl(event.target.value)}
          placeholder="https://registry.acmeu.com/plugins/workday.json"
        />
        <Input
          label="Credentials"
          type="password"
          hint="Stored encrypted and never returned by the API."
          value={credentials}
          onChange={(event) => setCredentials(event.target.value)}
        />
        <Textarea
          label="Configuration"
          monospace
          rows={6}
          value={configText}
          error={configError}
          onChange={(event) => setConfigText(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function Integrations() {
  const [connecting, setConnecting] = useState(false);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => getJson<Envelope<Integration>>('/integrations'),
  });

  const rows = integrations.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect AcmeU to the systems your organization already runs."
        action={
          <Button icon={<Plug className="h-4 w-4" />} onClick={() => setConnecting(true)}>
            Connect provider
          </Button>
        }
      />

      {integrations.isError ? (
        <ErrorState title="Integrations unavailable" description={errorMessage(integrations.error)} />
      ) : integrations.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No integrations connected"
          description="Connect a provider to sync rosters, courses, and completions."
          icon={<Boxes className="h-5 w-5" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {integration.display_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {titleCase(integration.provider)}
                    </p>
                  </div>
                  <Badge tone={integration.status === 'connected' ? 'success' : 'neutral'} dot>
                    {integration.status}
                  </Badge>
                </div>
                {integration.manifest_url ? (
                  <p className="truncate font-mono text-xs text-slate-400">
                    {integration.manifest_url}
                  </p>
                ) : null}
                <p className="text-xs text-slate-400">
                  {integration.connected_at
                    ? `Connected ${formatDate(integration.connected_at)}`
                    : 'Not connected yet'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WebhooksPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <LinkPreviewTool />
        <div className="space-y-4">
          <RosterImportTool />
          <CoursePackageTool />
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Users className="h-3.5 w-3.5" />
        Roster and package imports are recorded in the workspace audit log.
      </p>

      <ConnectModal open={connecting} onClose={() => setConnecting(false)} />
    </>
  );
}
