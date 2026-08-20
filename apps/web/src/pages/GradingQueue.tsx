import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDateTime, formatTimeAgo } from '../lib/format';
import type { AssignmentListItem, Course, Envelope, Paginated, QueueEntry } from '../lib/types';

function GradeModal({
  entry,
  open,
  onClose,
}: {
  entry: QueueEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [score, setScore] = useState('');
  const [feedbackMd, setFeedbackMd] = useState('');
  const [status, setStatus] = useState('graded');

  useEffect(() => {
    setScore(entry?.score !== null && entry?.score !== undefined ? String(entry.score) : '');
    setFeedbackMd('');
    setStatus('graded');
  }, [entry]);

  const grade = useMutation({
    mutationFn: () =>
      api.post(`/submissions/${entry?.id}/grade`, {
        score: Number(score),
        feedbackMd,
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Grade recorded', entry?.display_name);
      onClose();
    },
    onError: (error) => toast.error('Could not record the grade', errorMessage(error)),
  });

  return (
    <Modal
      open={open && Boolean(entry)}
      onClose={onClose}
      title={`Grade ${entry?.display_name ?? 'submission'}`}
      description={entry ? `Attempt #${entry.attempt} · submitted ${formatDateTime(entry.submitted_at)}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={grade.isPending} disabled={score === ''} onClick={() => grade.mutate()}>
            Save grade
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Score"
            type="number"
            min={0}
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
        <Textarea
          label="Feedback"
          hint="Markdown is supported and shared with the learner."
          rows={8}
          value={feedbackMd}
          onChange={(event) => setFeedbackMd(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function GradingQueue() {
  const params = useParams();
  const navigate = useNavigate();

  const [courseId, setCourseId] = useState(params.courseId ?? '');
  const [assignmentId, setAssignmentId] = useState(params.assignmentId ?? '');
  const [active, setActive] = useState<QueueEntry | null>(null);

  const courses = useQuery({
    queryKey: ['courses', { pageSize: 100, sort: 'title', direction: 'asc' }],
    queryFn: () =>
      getJson<Paginated<Course>>('/courses', {
        params: { pageSize: 100, sort: 'title', direction: 'asc' },
      }),
  });

  const assignments = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: () => getJson<Envelope<AssignmentListItem>>(`/courses/${courseId}/assignments`),
    enabled: Boolean(courseId),
  });

  const queue = useQuery({
    queryKey: ['queue', courseId, assignmentId],
    queryFn: () =>
      getJson<Envelope<QueueEntry>>(`/courses/${courseId}/assignments/${assignmentId}/queue`),
    enabled: Boolean(courseId && assignmentId),
  });

  const selectCourse = (value: string) => {
    setCourseId(value);
    setAssignmentId('');
  };

  const selectAssignment = (value: string) => {
    setAssignmentId(value);
    if (courseId && value) {
      navigate(`/courses/${courseId}/assignments/${value}/queue`, { replace: true });
    }
  };

  const columns: Array<Column<QueueEntry>> = [
    {
      key: 'learner',
      header: 'Learner',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.display_name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {row.display_name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'attempt', header: 'Attempt', render: (row) => `#${row.attempt}` },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (row.score === null ? <span className="text-slate-400">—</span> : row.score),
    },
    {
      key: 'submitted',
      header: 'Waiting',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">{formatTimeAgo(row.submitted_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            onClick={() => navigate(`/courses/${courseId}/submissions/${row.id}`)}
          >
            Open
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActive(row)}>
            Grade
          </Button>
        </div>
      ),
    },
  ];

  const pending = (queue.data?.data ?? []).filter((row) => row.status !== 'graded').length;

  return (
    <>
      <PageHeader
        title="Grading queue"
        description="Review and grade learner submissions for the courses you teach."
      />

      <Card>
        <CardHeader
          title="Select an assignment"
          description={pending ? `${pending} submissions awaiting a grade` : undefined}
        />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Course"
            placeholder="Choose a course"
            options={(courses.data?.data ?? []).map((course) => ({
              value: course.id,
              label: `${course.code} — ${course.title}`,
            }))}
            value={courseId}
            onChange={(event) => selectCourse(event.target.value)}
          />
          <Select
            label="Assignment"
            placeholder={courseId ? 'Choose an assignment' : 'Select a course first'}
            disabled={!courseId || assignments.isLoading}
            options={(assignments.data?.data ?? []).map((assignment) => ({
              value: assignment.id,
              label: assignment.title,
            }))}
            value={assignmentId}
            onChange={(event) => selectAssignment(event.target.value)}
          />
        </CardContent>
      </Card>

      {!courseId || !assignmentId ? (
        <EmptyState
          title="Nothing selected"
          description="Choose a course and an assignment to load its submission queue."
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      ) : queue.isError ? (
        <ErrorState title="Queue unavailable" description={errorMessage(queue.error)} />
      ) : (
        <Table
          columns={columns}
          rows={queue.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={queue.isLoading}
          emptyTitle="No submissions yet"
          emptyDescription="Learners have not submitted work for this assignment."
        />
      )}

      <GradeModal entry={active} open={Boolean(active)} onClose={() => setActive(null)} />
    </>
  );
}
