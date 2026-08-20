import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Checkbox, Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, titleCase } from '../lib/format';
import {
  atLeast,
  type AssignmentListItem,
  type CourseDetail,
  type Envelope,
  type SubmissionListItem,
} from '../lib/types';

function CreateAssignmentModal({
  courseId,
  open,
  onClose,
}: {
  courseId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [specMd, setSpecMd] = useState('');
  const [kind, setKind] = useState('written');
  const [maxPoints, setMaxPoints] = useState('100');
  const [weight, setWeight] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [autoGrade, setAutoGrade] = useState(false);
  const [graderRef, setGraderRef] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/courses/${courseId}/assignments`, {
        title,
        specMd,
        kind,
        maxPoints: Number(maxPoints),
        weight: Number(weight),
        rubric: [],
        autoGrade,
        graderRef: graderRef || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      toast.success('Assignment created');
      onClose();
    },
    onError: (error) => toast.error('Could not create the assignment', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New assignment"
      description="Learners see the specification as soon as the assignment opens."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} disabled={!title.trim()} onClick={() => mutation.mutate()}>
            Create assignment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          label="Specification"
          hint="Markdown. Describe the deliverable and the grading rubric."
          rows={6}
          value={specMd}
          onChange={(event) => setSpecMd(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            options={[
              { value: 'written', label: 'Written' },
              { value: 'quiz', label: 'Quiz' },
              { value: 'project', label: 'Project' },
              { value: 'code', label: 'Code' },
            ]}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          />
          <Input
            label="Maximum points"
            type="number"
            min={1}
            value={maxPoints}
            onChange={(event) => setMaxPoints(event.target.value)}
          />
          <Input
            label="Weight"
            type="number"
            min={0}
            step="0.1"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
          <Input
            label="Due date"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </div>
        <Checkbox
          label="Send submissions to the automated grading service"
          checked={autoGrade}
          onChange={(event) => setAutoGrade(event.target.checked)}
        />
        {autoGrade ? (
          <Input
            label="Grader reference"
            hint="Identifier of the grading pipeline to call."
            value={graderRef}
            onChange={(event) => setGraderRef(event.target.value)}
            placeholder="python-unit-tests"
          />
        ) : null}
      </div>
    </Modal>
  );
}

export default function Assignments() {
  const { courseId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const canAuthor = atLeast(user?.role, 'instructor');

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getJson<CourseDetail>(`/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  const assignments = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: () => getJson<Envelope<AssignmentListItem>>(`/courses/${courseId}/assignments`),
    enabled: Boolean(courseId),
  });

  const submissions = useQuery({
    queryKey: ['submissions', courseId],
    queryFn: () => getJson<Envelope<SubmissionListItem>>(`/courses/${courseId}/submissions`),
    enabled: Boolean(courseId),
  });

  const columns: Array<Column<AssignmentListItem>> = [
    {
      key: 'title',
      header: 'Assignment',
      render: (row) => (
        <div className="min-w-0">
          <Link
            to={`/courses/${courseId}/assignments/${row.id}`}
            className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          >
            {row.title}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">{titleCase(row.kind)}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(row.due_at, 'No due date')}</span>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.max_points}</span>,
    },
    {
      key: 'status',
      header: 'Your status',
      render: (row) =>
        row.submission_id ? (
          <StatusBadge status={row.submission_status} />
        ) : (
          <Badge tone="neutral">Not started</Badge>
        ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) =>
        row.score === null || row.score === undefined ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className="font-medium tabular-nums">
            {row.score} / {row.max_points}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {canAuthor ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${courseId}/assignments/${row.id}/queue`)}
            >
              Queue
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/assignments/${row.id}`)}
          >
            Open
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Assignments"
        description={
          course.data ? (
            <Link
              to={`/catalog/${courseId}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {course.data.title}
            </Link>
          ) : (
            'Course assessments'
          )
        }
        action={
          canAuthor ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              New assignment
            </Button>
          ) : null
        }
      />

      {assignments.isError ? (
        <ErrorState
          title="Assignments unavailable"
          description={errorMessage(assignments.error, 'You must be enrolled to see assignments.')}
        />
      ) : (
        <Table
          columns={columns}
          rows={assignments.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={assignments.isLoading}
          emptyTitle="No assignments yet"
          emptyDescription="This course does not have any graded work."
        />
      )}

      <Card>
        <CardHeader title="Your submissions" description="Every attempt you have made in this course" />
        <CardContent>
          <Table
            columns={[
              {
                key: 'attempt',
                header: 'Attempt',
                render: (row: SubmissionListItem) => (
                  <span className="font-medium text-slate-800 dark:text-slate-200">#{row.attempt}</span>
                ),
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
                  row.score === null ? <span className="text-slate-400">—</span> : row.score,
              },
              {
                key: 'submitted',
                header: 'Submitted',
                render: (row: SubmissionListItem) => formatDateTime(row.submitted_at),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row: SubmissionListItem) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ClipboardList className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/courses/${courseId}/submissions/${row.id}`)}
                  >
                    View
                  </Button>
                ),
              },
            ]}
            rows={submissions.data?.data ?? []}
            rowKey={(row) => row.id}
            loading={submissions.isLoading}
            emptyTitle="No submissions yet"
            emptyDescription="Your attempts will appear here once you submit work."
          />
        </CardContent>
      </Card>

      {canAuthor ? (
        <CreateAssignmentModal courseId={courseId} open={creating} onClose={() => setCreating(false)} />
      ) : null}
    </>
  );
}
