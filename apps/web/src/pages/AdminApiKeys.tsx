import { useQuery } from '@tanstack/react-query';
import { Building2, KeyRound, Users } from 'lucide-react';
import { ApiKeysPanel } from '../components/ApiKeysPanel';
import { PageHeader } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { getJson } from '../lib/api';
import { formatNumber, titleCase } from '../lib/format';
import type { TenantOverview } from '../lib/types';

export default function AdminApiKeys() {
  const tenant = useQuery({
    queryKey: ['admin', 'tenant'],
    queryFn: () => getJson<TenantOverview>('/admin/tenant'),
  });

  return (
    <>
      <PageHeader
        title="API keys"
        description="Programmatic access for the systems that integrate with this workspace."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Workspace"
          value={tenant.data?.tenant.name ?? '—'}
          hint={tenant.data ? `Plan: ${titleCase(tenant.data.tenant.plan)}` : undefined}
          icon={<Building2 className="h-4 w-4" />}
          loading={tenant.isLoading}
        />
        <StatTile
          label="Members"
          value={formatNumber(tenant.data?.stats.users ?? 0)}
          icon={<Users className="h-4 w-4" />}
          loading={tenant.isLoading}
        />
        <StatTile
          label="Seats purchased"
          value={formatNumber(tenant.data?.tenant.seats_purchased ?? 0)}
          icon={<KeyRound className="h-4 w-4" />}
          loading={tenant.isLoading}
        />
      </div>

      <ApiKeysPanel />
    </>
  );
}
