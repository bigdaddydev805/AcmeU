import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCog } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson, patchSession } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatTimeAgo, titleCase } from '../lib/format';
import { ROLES, type AdminUser, type Envelope, type SessionUser } from '../lib/types';

const STATUSES = ['active', 'invited', 'disabled'];

interface ImpersonateResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

function ImpersonateModal({
  target,
  open,
  onClose,
}: {
  target: AdminUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');

  const impersonate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ImpersonateResponse>('/admin/impersonate', {
        userId: target?.id,
        reason: reason || undefined,
      });
      return data;
    },
    onSuccess: (data) => {
      patchSession({ accessToken: data.accessToken, user: data.user });
      window.location.assign('/dashboard');
    },
    onError: (error) => toast.error('Could not start the session', errorMessage(error)),
  });

  return (
    <Modal
      open={open && Boolean(target)}
      onClose={onClose}
      title={`Sign in as ${target?.display_name ?? ''}`}
      description="Impersonation is recorded in the audit log with the reason you provide."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={impersonate.isPending} onClick={() => impersonate.mutate()}>
            Start session
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          You will act as this person until you sign out. Their data changes as if they made them.
        </div>
        <Textarea
          label="Reason"
          hint="Reference a support ticket where possible."
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Investigating SUP-4192: learner cannot open lesson"
        />
      </div>
    </Modal>
  );
}

export default function AdminUsers() {
  const { permissions } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [impersonating, setImpersonating] = useState<AdminUser | null>(null);

  const canImpersonate = Boolean(permissions.manageTenant);

  const users = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => getJson<Envelope<AdminUser>>('/admin/users', { params: { q: search || undefined } }),
    placeholderData: keepPreviousData,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Role updated');
    },
    onError: (error) => toast.error('Could not update the role', errorMessage(error)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error('Could not update the status', errorMessage(error)),
  });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(term.trim());
  };

  const columns: Array<Column<AdminUser>> = [
    {
      key: 'person',
      header: 'Person',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.display_name} src={row.avatar_url} size="sm" />
          <div className="min-w-0">
            <Link
              to={`/profile/${row.id}`}
              className="truncate text-sm font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
            >
              {row.display_name}
            </Link>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '11rem',
      render: (row) => (
        <Select
          aria-label={`Role for ${row.display_name}`}
          options={ROLES.map((role) => ({ value: role, label: titleCase(role) }))}
          value={row.role}
          onChange={(event) => updateRole.mutate({ id: row.id, role: event.target.value })}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '10rem',
      render: (row) => (
        <Select
          aria-label={`Status for ${row.display_name}`}
          options={STATUSES.map((status) => ({ value: status, label: titleCase(status) }))}
          value={row.status}
          onChange={(event) => updateStatus.mutate({ id: row.id, status: event.target.value })}
        />
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      render: (row) =>
        row.mfa_enabled ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>,
    },
    {
      key: 'last_login',
      header: 'Last seen',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.last_login_at ? formatTimeAgo(row.last_login_at) : 'Never'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (row) => formatDate(row.created_at),
    },
    ...(canImpersonate
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: AdminUser) => (
              <Button
                variant="ghost"
                size="sm"
                icon={<UserCog className="h-3.5 w-3.5" />}
                onClick={() => setImpersonating(row)}
              >
                Impersonate
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="People"
        description="Manage roles, access, and account status across your workspace."
      />

      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={onSearch}>
            <Input
              containerClassName="min-w-[240px] flex-1"
              label="Search"
              leadingIcon={<Search className="h-4 w-4" />}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by name or email"
            />
            <Button type="submit">Search</Button>
            {search ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setTerm('');
                  setSearch('');
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {users.isError ? (
        <ErrorState title="Directory unavailable" description={errorMessage(users.error)} />
      ) : (
        <Table
          columns={columns}
          rows={users.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={users.isLoading}
          emptyTitle="No people match that search"
          emptyDescription="Try a different name or email address."
        />
      )}

      {canImpersonate ? (
        <ImpersonateModal
          target={impersonating}
          open={Boolean(impersonating)}
          onClose={() => setImpersonating(null)}
        />
      ) : null}
    </>
  );
}
