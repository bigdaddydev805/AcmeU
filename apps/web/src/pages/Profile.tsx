import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, Coins, Mail, Settings as SettingsIcon } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Spinner';
import { StatTile } from '../components/StatTile';
import { errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatNumber, formatPercent, titleCase } from '../lib/format';
import type { Certificate, EnrollmentListItem, Envelope, PublicProfile } from '../lib/types';

function OtherProfile({ userId }: { userId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getJson<PublicProfile>(`/users/${userId}`),
  });

  if (isLoading) return <SkeletonCard rows={4} />;
  if (isError || !data) {
    return <ErrorState title="Profile unavailable" description={errorMessage(error)} />;
  }

  return (
    <>
      <PageHeader title={data.displayName} description={data.title ?? undefined} />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          <Avatar name={data.displayName} src={data.avatarUrl} size="lg" />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{titleCase(data.role)}</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Member since {formatDate(data.createdAt)}
              </span>
            </div>
            {data.bio ? (
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{data.bio}</p>
            ) : (
              <p className="text-sm text-slate-400">This person has not added a bio yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function SelfProfile() {
  const { profile } = useAuth();

  const enrollments = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => getJson<Envelope<EnrollmentListItem>>('/enrollments'),
  });

  const certificates = useQuery({
    queryKey: ['credentials'],
    queryFn: () => getJson<Envelope<Certificate>>('/credentials'),
  });

  if (!profile) {
    return <SkeletonCard rows={4} />;
  }

  const rows = enrollments.data?.data ?? [];
  const completed = rows.filter((row) => row.completed_at || row.progress_pct >= 100);
  const averageProgress = rows.length
    ? rows.reduce((total, row) => total + row.progress_pct, 0) / rows.length
    : 0;

  return (
    <>
      <PageHeader
        title="Your profile"
        description="How you appear to other people in this workspace."
        action={
          <Link to="/settings">
            <Button variant="outline" icon={<SettingsIcon className="h-4 w-4" />}>
              Edit profile
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size="lg" />
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {profile.displayName}
              </p>
              {profile.title ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile.title}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{titleCase(profile.role)}</Badge>
              <Badge tone="neutral">{profile.locale}</Badge>
              <Badge tone="neutral">{profile.timezone}</Badge>
              {profile.mfaEnabled ? <Badge tone="success">MFA enabled</Badge> : null}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </p>
            {profile.bio ? (
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Enrollments"
          value={formatNumber(rows.length)}
          icon={<BookOpen className="h-4 w-4" />}
          loading={enrollments.isLoading}
        />
        <StatTile
          label="Completed"
          value={formatNumber(completed.length)}
          icon={<Award className="h-4 w-4" />}
          loading={enrollments.isLoading}
        />
        <StatTile
          label="Average progress"
          value={formatPercent(averageProgress)}
          loading={enrollments.isLoading}
        />
        <StatTile
          label="Credits"
          value={formatNumber(profile.credits)}
          icon={<Coins className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent enrollments" />
          <CardContent className="space-y-2">
            {rows.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/catalog/${enrollment.course_id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="truncate text-slate-700 dark:text-slate-300">{enrollment.title}</span>
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatPercent(enrollment.progress_pct)}
                </span>
              </Link>
            ))}
            {!enrollments.isLoading && rows.length === 0 ? (
              <EmptyState title="No enrollments yet" className="border-0 bg-transparent py-6" />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Certificates" />
          <CardContent className="space-y-2">
            {(certificates.data?.data ?? []).slice(0, 5).map((certificate) => (
              <div
                key={certificate.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {certificate.course_title}
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-400">{certificate.serial}</span>
              </div>
            ))}
            {!certificates.isLoading && (certificates.data?.data.length ?? 0) === 0 ? (
              <EmptyState title="No certificates yet" className="border-0 bg-transparent py-6" />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();

  if (userId && userId !== user?.id) {
    return <OtherProfile userId={userId} />;
  }

  return <SelfProfile />;
}
