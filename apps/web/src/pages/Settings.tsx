import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Braces, Laptop, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { ApiKeysPanel } from '../components/ApiKeysPanel';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardFooter, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { formatDateTime, safeJson } from '../lib/format';
import { atLeast, type DeviceSession, type Envelope, type MfaEnrollment } from '../lib/types';

const LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'ja-JP', label: 'Japanese' },
];

const TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Australia/Sydney',
];

function ProfileSection() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [locale, setLocale] = useState('en-US');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setTitle(profile.title ?? '');
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setLocale(profile.locale ?? 'en-US');
    setTimezone(profile.timezone ?? 'UTC');
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/users/me', {
        displayName,
        title: title || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        locale,
        timezone,
      }),
    onSuccess: async () => {
      await refreshProfile();
      toast.success('Profile updated');
    },
    onError: (error) => toast.error('Could not save your profile', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader title="Profile" description="This information is visible across your workspace." />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Display name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input
          label="Job title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Security Engineer"
        />
        <Input
          label="Avatar URL"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="https://cdn.example.com/avatar.png"
        />
        <Select
          label="Locale"
          options={LOCALES}
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
        />
        <Select
          label="Time zone"
          options={TIMEZONES.map((value) => ({ value, label: value }))}
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        />
        <Textarea
          containerClassName="sm:col-span-2"
          label="Bio"
          rows={4}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="A short introduction shown on your profile."
        />
      </CardContent>
      <CardFooter>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}

function PreferencesSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('{}');
  const [parseError, setParseError] = useState<string | null>(null);

  const preferences = useQuery({
    queryKey: ['preferences'],
    queryFn: () => getJson<Record<string, unknown>>('/users/me/preferences'),
  });

  useEffect(() => {
    if (preferences.data) {
      setDraft(safeJson(preferences.data));
    }
  }, [preferences.data]);

  const save = useMutation({
    mutationFn: () => {
      const payload = JSON.parse(draft);
      return api.put('/users/me/preferences', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preferences saved');
    },
    onError: (error) => toast.error('Could not save preferences', errorMessage(error)),
  });

  const onSave = () => {
    try {
      JSON.parse(draft);
      setParseError(null);
      save.mutate();
    } catch (error) {
      setParseError((error as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Preferences"
        description="Workspace preferences are stored as JSON and merged with your existing settings."
        action={<Badge tone="neutral">advanced</Badge>}
      />
      <CardContent>
        <Textarea
          label={
            <span className="flex items-center gap-1.5">
              <Braces className="h-3.5 w-3.5" />
              preferences.json
            </span>
          }
          monospace
          rows={12}
          value={draft}
          error={parseError}
          onChange={(event) => setDraft(event.target.value)}
        />
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={() => preferences.refetch()}>
          Reset
        </Button>
        <Button loading={save.isPending} onClick={onSave}>
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader title="Appearance" description="Applies to this browser only." />
      <CardContent className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
            theme === 'light'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
            theme === 'dark'
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);

  const enroll = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<MfaEnrollment>('/auth/mfa/enroll');
      return data;
    },
    onSuccess: async (data) => {
      setEnrollment(data);
      await refreshProfile();
      toast.success('Two-factor authentication enabled');
    },
    onError: (error) => toast.error('Could not start enrollment', errorMessage(error)),
  });

  const disable = useMutation({
    mutationFn: () => api.post('/auth/mfa/disable'),
    onSuccess: async () => {
      setEnrollment(null);
      await refreshProfile();
      toast.success('Two-factor authentication disabled');
    },
    onError: (error) => toast.error('Could not disable two-factor', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Two-factor authentication"
        description="Require a time-based code in addition to your password."
        action={
          profile?.mfaEnabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="warning">Off</Badge>
        }
      />
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Scan the provisioning URL with an authenticator app. Backup codes let you sign in if you
          lose your device.
        </p>

        {enrollment ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secret</p>
              <code className="break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                {enrollment.secret}
              </code>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Provisioning URL
              </p>
              <code className="break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                {enrollment.otpauthUrl}
              </code>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Backup codes
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {enrollment.backupCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        {profile?.mfaEnabled ? (
          <Button variant="outline" loading={disable.isPending} onClick={() => disable.mutate()}>
            Disable two-factor
          </Button>
        ) : null}
        <Button
          icon={<ShieldCheck className="h-4 w-4" />}
          loading={enroll.isPending}
          onClick={() => enroll.mutate()}
        >
          {profile?.mfaEnabled ? 'Regenerate codes' : 'Enable two-factor'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SessionsSection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getJson<Envelope<DeviceSession>>('/users/me/sessions'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/sessions/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
    },
    onError: (error) => toast.error('Could not revoke the session', errorMessage(error)),
  });

  const columns: Array<Column<DeviceSession>> = [
    {
      key: 'device',
      header: 'Device',
      render: (row) => (
        <div className="flex items-start gap-2">
          <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span className="line-clamp-2 max-w-md text-sm text-slate-700 dark:text-slate-300">
            {row.user_agent ?? 'Unknown client'}
          </span>
        </div>
      ),
    },
    {
      key: 'ip',
      header: 'IP address',
      render: (row) => <span className="font-mono text-xs">{row.ip_address ?? '—'}</span>,
    },
    { key: 'created', header: 'Signed in', render: (row) => formatDateTime(row.created_at) },
    { key: 'expires', header: 'Expires', render: (row) => formatDateTime(row.expires_at) },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.revoked_at ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
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
      ),
    },
  ];

  return (
    <Card>
      <CardHeader title="Active sessions" description="Sign out devices you no longer recognise." />
      <CardContent className="p-0">
        {sessions.isError ? (
          <div className="p-5">
            <ErrorState title="Sessions unavailable" description={errorMessage(sessions.error)} />
          </div>
        ) : (
          <Table
            className="rounded-none border-0 shadow-none"
            columns={columns}
            rows={sessions.data?.data ?? []}
            rowKey={(row) => row.id}
            loading={sessions.isLoading}
            emptyTitle="No active sessions"
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, security, and workspace access." />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection />
        <PreferencesSection />
      </div>

      <AppearanceSection />
      <SecuritySection />
      <SessionsSection />

      {atLeast(user?.role, 'manager') ? (
        <ApiKeysPanel description="Keys you and your team use for server-to-server integrations." />
      ) : null}
    </>
  );
}
