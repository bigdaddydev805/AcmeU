import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ListChecks, Paperclip, Send, Upload } from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Textarea } from '../components/Input';
import { Markdown, MarkdownPreview } from '../components/Markdown';
import { SkeletonCard } from '../components/Spinner';
import { Table } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatBytes, formatDateTime } from '../lib/format';
import {
  atLeast,
  type AssignmentDetail as AssignmentDetailType,
  type Envelope,
  type StoredFile,
  type SubmissionListItem,
} from '../lib/types';

export default function AssignmentDetail() {
  const { courseId = '', assignmentId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [bodyMd, setBodyMd] = useState('');
  const [preview, setPreview] = useState(false);
  const [attachment, setAttachment] = useState<StoredFile | null>(null);

  const assignment = useQuery({
    queryKey: ['assignment', courseId, assignmentId],
    queryFn: () => getJson<AssignmentDetailType>(`/courses/${courseId}/assignments/${assignmentId}`),
    enabled: Boolean(courseId && assignmentId),
  });

  const submissions = useQuery({
    queryKey: ['submissions', courseId],
    queryFn: () => getJson<Envelope<SubmissionListItem>>(`/courses/${courseId}/submissions`),
    enabled: Boolean(courseId),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<StoredFile>('/files', form);
      return data;
    },
    onSuccess: (file) => {
      setAttachment(file);
      toast.success('File attached', file.filename);
    },
    onError: (error) => toast.error('Upload failed', errorMessage(error)),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/courses/${courseId}/assignments/${assignmentId}/submissions`, {
        bodyMd,
        fileId: attachment?.id ?? null,
      }),
    onSuccess: async () => {
      setBodyMd('');
      setAttachment(null);
      setPreview(false);
      await queryClient.invalidateQueries({ queryKey: ['submissions', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      toast.success('Submission received', 'You will be notified when it is graded.');
    },
    onError: (error) => toast.error('Submission failed', errorMessage(error)),
  });

  if (assignment.isLoading) {
    return <SkeletonCard rows={6} />;
  }

  if (assignment.isError || !assignment.data) {
    return (
      <ErrorState
        title="Assignment unavailable"
        description={errorMessage(assignment.error, 'You must be enrolled to open this assignment.')}
      />
    );
  }

  const data = assignment.data;
  const attempts = (submissions.data?.data ?? []).filter((row) => row.assignment_id === assignmentId);

  return (
    <>
      <PageHeader
        title={data.title}
        description={
          <Link
            to={`/courses/${courseId}/assignments`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Back to assignments
          </Link>
        }
        action={
          atLeast(user?.role, 'instructor') ? (
            <Button
              variant="outline"
              icon={<ListChecks className="h-4 w-4" />}
              onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/queue`)}
            >
              Grading queue
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{data.kind}</Badge>
        <Badge tone="neutral">{data.maxPoints} points</Badge>
        {data.dueAt ? (
          <Badge tone="warning">
            <CalendarClock className="h-3 w-3" />
            Due {formatDateTime(data.dueAt)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Specification" />
            <CardContent>
              <Markdown html={data.specHtml} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Submit your work"
              description="Markdown is supported. Attach a file if the brief asks for one."
              action={
                <Button variant="ghost" size="sm" onClick={() => setPreview((value) => !value)}>
                  {preview ? 'Edit' : 'Preview'}
                </Button>
              }
            />
            <CardContent className="space-y-3">
              {preview ? (
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <MarkdownPreview source={bodyMd} />
                </div>
              ) : (
                <Textarea
                  rows={10}
                  value={bodyMd}
                  onChange={(event) => setBodyMd(event.target.value)}
                  placeholder="Explain your approach, paste your answer, or summarise the attached deliverable."
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload.mutate(file);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Upload className="h-3.5 w-3.5" />}
                    loading={upload.isPending}
                    onClick={() => fileInput.current?.click()}
                  >
                    Attach file
                  </Button>
                  {attachment ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Paperclip className="h-3.5 w-3.5" />
                      {attachment.filename} · {formatBytes(attachment.sizeBytes)}
                    </span>
                  ) : null}
                </div>

                <Button
                  icon={<Send className="h-4 w-4" />}
                  loading={submit.isPending}
                  disabled={!bodyMd.trim() && !attachment}
                  onClick={() => submit.mutate()}
                >
                  Submit attempt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your attempts" />
            <CardContent className="p-0">
              <Table
                className="rounded-none border-0 shadow-none"
                columns={[
                  {
                    key: 'attempt',
                    header: 'Attempt',
                    render: (row: SubmissionListItem) => `#${row.attempt}`,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row: SubmissionListItem) => <StatusBadge status={row.status} />,
                  },
                  {
                    key: 'score',
                    header: 'Score',
                    align: 'right',
                    render: (row: SubmissionListItem) =>
                      row.score === null ? '—' : `${row.score}/${data.maxPoints}`,
                  },
                  {
                    key: 'open',
                    header: '',
                    align: 'right',
                    render: (row: SubmissionListItem) => (
                      <Link
                        to={`/courses/${courseId}/submissions/${row.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        View
                      </Link>
                    ),
                  },
                ]}
                rows={attempts}
                rowKey={(row) => row.id}
                loading={submissions.isLoading}
                emptyTitle="No attempts yet"
              />
            </CardContent>
          </Card>

          {data.rubric.length > 0 ? (
            <Card>
              <CardHeader title="Rubric" />
              <CardContent className="space-y-2 text-sm">
                {data.rubric.map((criterion, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {String(criterion.label ?? criterion.name ?? `Criterion ${index + 1}`)}
                    </p>
                    {criterion.description ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {String(criterion.description)}
                      </p>
                    ) : null}
                    {criterion.points !== undefined ? (
                      <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {String(criterion.points)} points
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
