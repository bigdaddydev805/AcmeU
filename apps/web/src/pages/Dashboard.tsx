import { useMemo, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, BookOpen, Coins, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Badge } from '../components/Badge';
import { getJson, graphqlRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { formatCurrency, formatMonthKey, formatNumber, formatPercent, titleCase } from '../lib/format';
import type {
  Certificate,
  CreditsResponse,
  EnrollmentListItem,
  Envelope,
  StatBucket,
} from '../lib/types';

const OVERVIEW_QUERY = /* GraphQL */ `
  query ConsoleOverview($months: Int) {
    enrollmentTrend(months: $months) {
      key
      value
      label
    }
    completionByCategory {
      key
      value
      label
    }
    revenueTrend(months: $months) {
      key
      value
      label
    }
  }
`;

interface OverviewResponse {
  enrollmentTrend: StatBucket[];
  completionByCategory: StatBucket[];
  revenueTrend: StatBucket[];
}

function ChartCard({
  title,
  description,
  loading,
  empty,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  empty: boolean;
  children: ReactElement;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardContent>
        {loading ? (
          <div className="skeleton h-56 w-full" />
        ) : empty ? (
          <EmptyState title="No data for this period" className="border-0 bg-transparent py-10" />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();

  const axisColor = theme === 'dark' ? '#64748b' : '#94a3b8';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
    borderRadius: '0.75rem',
    fontSize: '0.8rem',
    color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
  };

  const analytics = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () => graphqlRequest<OverviewResponse>(OVERVIEW_QUERY, { months: 12 }),
  });

  const enrollments = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => getJson<Envelope<EnrollmentListItem>>('/enrollments'),
  });

  const certificates = useQuery({
    queryKey: ['credentials'],
    queryFn: () => getJson<Envelope<Certificate>>('/credentials'),
  });

  const credits = useQuery({
    queryKey: ['billing', 'credits'],
    queryFn: () => getJson<CreditsResponse>('/billing/credits'),
  });

  const activeEnrollments = useMemo(
    () => (enrollments.data?.data ?? []).filter((entry) => entry.status === 'active'),
    [enrollments.data],
  );

  const averageProgress = useMemo(() => {
    const rows = enrollments.data?.data ?? [];
    if (!rows.length) return 0;
    return rows.reduce((total, row) => total + (row.progress_pct ?? 0), 0) / rows.length;
  }, [enrollments.data]);

  const enrollmentSeries = (analytics.data?.enrollmentTrend ?? []).map((bucket) => ({
    label: bucket.label ?? formatMonthKey(bucket.key),
    value: bucket.value,
  }));

  const categorySeries = (analytics.data?.completionByCategory ?? []).map((bucket) => ({
    label: bucket.label ?? titleCase(bucket.key),
    value: bucket.value,
  }));

  const revenueSeries = (analytics.data?.revenueTrend ?? []).map((bucket) => ({
    label: bucket.label ?? formatMonthKey(bucket.key),
    value: bucket.value / 100,
  }));

  const continueLearning = activeEnrollments.slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.displayName?.split(' ')[0] ?? 'there'}`}
        description="Here is how your learning programs are tracking this quarter."
        action={
          profile ? (
            <Badge tone="neutral">
              Workspace role: <span className="ml-1 font-semibold">{titleCase(profile.role)}</span>
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active courses"
          value={formatNumber(activeEnrollments.length)}
          hint="Enrollments currently in progress"
          icon={<BookOpen className="h-4 w-4" />}
          loading={enrollments.isLoading}
        />
        <StatTile
          label="Average progress"
          value={formatPercent(averageProgress)}
          hint="Across all of your enrollments"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={enrollments.isLoading}
        />
        <StatTile
          label="Certificates"
          value={formatNumber(certificates.data?.data.length ?? 0)}
          hint="Credentials issued to you"
          icon={<Award className="h-4 w-4" />}
          loading={certificates.isLoading}
        />
        <StatTile
          label="Credit balance"
          value={formatNumber(credits.data?.balance ?? 0)}
          hint="Available learning credits"
          icon={<Coins className="h-4 w-4" />}
          loading={credits.isLoading}
        />
      </div>

      {analytics.isError ? (
        <ErrorState
          title="Analytics are unavailable"
          description="The reporting service did not return data for this workspace."
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Enrollment trend"
          description="New enrollments per month"
          loading={analytics.isLoading}
          empty={enrollmentSeries.length === 0}
        >
          <LineChart data={enrollmentSeries} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: gridColor }} />
            <Line
              type="monotone"
              dataKey="value"
              name="Enrollments"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartCard>

        <ChartCard
          title="Completions by category"
          description="Completed enrollments grouped by catalog category"
          loading={analytics.isLoading}
          empty={categorySeries.length === 0}
        >
          <BarChart data={categorySeries} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
            <Bar dataKey="value" name="Completions" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Revenue trend"
          description="Recognised revenue per month"
          loading={analytics.isLoading}
          empty={revenueSeries.length === 0}
        >
          <AreaChart data={revenueSeries} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `$${formatNumber(value)}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => formatCurrency(value * 100)}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Revenue"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ChartCard>

        <Card>
          <CardHeader
            title="Continue learning"
            description="Pick up where you left off"
            action={
              <Link
                to="/learning"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                View all
              </Link>
            }
          />
          <CardContent className="space-y-3">
            {enrollments.isLoading ? (
              <>
                <div className="skeleton h-14 w-full" />
                <div className="skeleton h-14 w-full" />
                <div className="skeleton h-14 w-full" />
              </>
            ) : continueLearning.length === 0 ? (
              <EmptyState
                title="No active enrollments"
                description="Browse the catalog to find your next course."
                className="border-0 bg-transparent py-6"
                action={
                  <Link
                    to="/catalog"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Explore the catalog
                  </Link>
                }
              />
            ) : (
              continueLearning.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  to={`/catalog/${enrollment.course_id}`}
                  className="block rounded-lg border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {enrollment.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {enrollment.code} · {titleCase(enrollment.category)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatPercent(enrollment.progress_pct)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, enrollment.progress_pct)}%` }}
                    />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
