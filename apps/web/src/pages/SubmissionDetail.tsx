import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, GraduationCap } from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Markdown, MarkdownPreview } from '../components/Markdown';
import { Select } from '../components/Select';
import { SkeletonCard } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';
import { atLeast, type SubmissionDetail as SubmissionDetailType } from '../lib/types';

function GradingPanel({ submission }: { submission: SubmissionDetailType }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [score, setScore] = useState(String(submission.score ?? ''));
  const [feedbackMd, setFeedbackMd] = useState('');
  const [status, setStatus] = useState('graded');
  const [preview, setPreview] = useState(false);

  const grade = useMutation({
    mutationFn: () =>
      api.post(`/submissions/${submission.id}/grade`, {
        score: Number(score),
        feedbackMd,
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submission', submission.id] });
      await queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Grade recorded');
    },
    onError: (error) => toast.error('Could not record the grade', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Grade this submission"
        description={`Maximum ${submission.maxPoints} points`}
        action={
          <Button variant="ghost" size="sm" onClick={() => setPreview((value) => !value)}>
            {preview ? 'Edit' : 'Preview'}
          </Button>
        }
      />
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Score"
            type="number"
            min={0}
            max={submission.maxPoints}
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
          <Select
            label="Outcome"
            options={[
              { value: 'graded', label: 'Graded' },
              { value: 'returned', label: 'Returned' },
              { value: 'resubmit', label: 'Needs resubmission' },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>

        {preview ? (
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <MarkdownPreview source={feedbackMd} />
          </div>
        ) : (
          <Textarea
            label="Feedback"
            hint="Markdown is supported and shared with the learner."
            rows={8}
            value={feedbackMd}
            onChange={(event) => setFeedbackMd(event.target.value)}
          />
        )}

        <div className="flex justify-end">
          <Button
            icon={<GraduationCap className="h-4 w-4" />}
            loading={grade.isPending}
            disabled={score === ''}
            onClick={() => grade.mutate()}
          >
            Save grade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubmissionDetail() {
  const { courseId = '', submissionId = '' } = useParams();
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () =>
      getJson<SubmissionDetailType>(`/courses/${courseId}/submissions/${submissionId}`),
    enabled: Boolean(courseId && submissionId),
  });

  if (isLoading) {
    return <SkeletonCard rows={6} />;
  }

  if (isError || !data) {
    return <ErrorState title="Submission unavailable" description={errorMessage(error)} />;
  }

  const canGrade = atLeast(user?.role, 'instructor');

  return (
    <>
      <PageHeader
        title={data.assignmentTitle}
        description={
          <Link
            to={`/courses/${courseId}/assignments/${data.assignmentId}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Back to assignment
          </Link>
        }
        action={
          data.fileId ? (
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => window.open(`/api/v1/files/${data.fileId}/download`, '_blank')}
            >
              Download attachment
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={data.status} />
        <Badge tone="neutral">Attempt #{data.attempt}</Badge>
        <Badge tone="info">{data.authorName}</Badge>
        <Badge tone="neutral">Submitted {formatDateTime(data.submittedAt)}</Badge>
        {data.score !== null ? (
          <Badge tone="success">
            {data.score} / {data.maxPoints}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Submitted work" />
            <CardContent>
              <Markdown html={data.bodyHtml} />
            </CardContent>
          </Card>

          {canGrade ? <GradingPanel submission={data} /> : null}
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Instructor feedback"
            description={data.gradedAt ? `Graded ${formatDateTime(data.gradedAt)}` : 'Not graded yet'}
          />
          <CardContent>
            <Markdown html={data.feedbackHtml} emptyLabel="No feedback has been left yet." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
