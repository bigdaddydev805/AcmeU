import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Webhook as WebhookIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHeader } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { WebhooksPanel } from '../components/WebhooksPanel';
import { getJson } from '../lib/api';
import { formatNumber } from '../lib/format';
import type { Envelope, Webhook } from '../lib/types';

export default function Webhooks() {
  const webhooks = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => getJson<Envelope<Webhook>>('/integrations/webhooks'),
  });

  const rows = webhooks.data?.data ?? [];
  const active = rows.filter((row) => row.active).length;
  const healthy = rows.filter((row) => row.last_status && row.last_status < 400).length;

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Outbound event delivery for this workspace."
        action={
          <Link to="/integrations">
            <Button variant="outline">All integrations</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Endpoints"
          value={formatNumber(rows.length)}
          icon={<WebhookIcon className="h-4 w-4" />}
          loading={webhooks.isLoading}
        />
        <StatTile
          label="Active"
          value={formatNumber(active)}
          icon={<Activity className="h-4 w-4" />}
          loading={webhooks.isLoading}
        />
        <StatTile
          label="Healthy last delivery"
          value={formatNumber(healthy)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={webhooks.isLoading}
        />
      </div>

      <WebhooksPanel />
    </>
  );
}
