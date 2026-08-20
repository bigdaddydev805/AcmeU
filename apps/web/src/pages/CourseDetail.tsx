import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Clock,
  FileText,
  MessageSquare,
  PencilLine,
  PlayCircle,
  Star,
  Users,
} from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Markdown } from '../components/Markdown';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { SkeletonCard } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDuration, formatNumber, titleCase } from '../lib/format';
import { atLeast, type CourseDetail as CourseDetailType } from '../lib/types';

function EditCourseModal({
  course,
  open,
  onClose,
}: {
  course: CourseDetailType;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(course.title);
  const [subtitle, setSubtitle] = useState(course.subtitle ?? '');
  const [descriptionMd, setDescriptionMd] = useState('');
  const [status, setStatus] = useState(course.status);
  const [price, setPrice] = useState(String(course.priceCents / 100));

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/courses/${course.id}`, {
        title,
        subtitle: subtitle || null,
        descriptionMd: descriptionMd || undefined,
        status,
        priceCents: Math.round(Number(price) * 100),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['course', course.id] });
      toast.success('Course updated');
      onClose();
    },
    onError: (error) => toast.error('Update failed', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit course"
      description="Changes are visible to learners as soon as the course is published."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input
          label="Subtitle"
          value={subtitle}
          onChange={(event) => setSubtitle(event.target.value)}
        />
        <Textarea
          label="Description"
          hint="Markdown. Leave blank to keep the current description."
          rows={6}
          value={descriptionMd}
          onChange={(event) => setDescriptionMd(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
          <Input
            label="Price (USD)"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function CourseDetail() {
  const { courseId = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: course, isLoading, isError, error } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getJson<CourseDetailType>(`/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  const enroll = useMutation({
    mutationFn: () => api.post('/enrollments', { courseId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('You are enrolled', 'The course now appears in My learning.');
    },
    onError: (err) => toast.error('Enrollment failed', errorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={6} />
      </div>
    );
  }

  if (isError || !course) {
    return <ErrorState title="Course unavailable" description={errorMessage(error)} />;
  }

  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  const firstLesson = course.modules.find((module) => module.lessons.length > 0)?.lessons[0];
  const canEdit = atLeast(user?.role, 'instructor');

  return (
    <>
      <PageHeader
        title={course.title}
        description={course.subtitle ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button
                variant="outline"
                icon={<PencilLine className="h-4 w-4" />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            ) : null}
            <Button
              variant="outline"
              icon={<MessageSquare className="h-4 w-4" />}
              onClick={() => navigate(`/courses/${course.id}/discussion`)}
            >
              Discussion
            </Button>
            <Button
              variant="outline"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => navigate(`/courses/${course.id}/assignments`)}
            >
              Assignments
            </Button>
            {course.enrollment ? (
              firstLesson ? (
                <Button
                  icon={<PlayCircle className="h-4 w-4" />}
                  onClick={() => navigate(`/catalog/${course.id}/lessons/${firstLesson.id}`)}
                >
                  Continue
                </Button>
              ) : null
            ) : (
              <Button loading={enroll.isPending} onClick={() => enroll.mutate()}>
                Enroll now
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{titleCase(course.category)}</Badge>
        <Badge tone="neutral">{titleCase(course.level)}</Badge>
        <StatusBadge status={course.status} />
        {course.tags.map((tag) => (
          <Badge key={tag} tone="info">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="About this course" />
            <CardContent>
              <Markdown html={course.descriptionHtml} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Curriculum"
              description={`${course.modules.length} modules · ${lessonCount} lessons`}
            />
            <CardContent className="space-y-4">
              {course.modules.map((module) => (
                <div key={module.id}>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {module.position}. {module.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/catalog/${course.id}/lessons/${lesson.id}`}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <PlayCircle className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{lesson.title}</span>
                            {lesson.isPreview ? <Badge tone="success">Preview</Badge> : null}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatDuration(lesson.durationMins)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Course details" />
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" /> Duration
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDuration(course.durationMins)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <BookOpen className="h-4 w-4" /> Lessons
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{lessonCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Star className="h-4 w-4" /> Rating
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {course.ratingAvg.toFixed(1)} ({formatNumber(course.ratingCount)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4" /> Seats
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatNumber(course.seatsTaken)}
                  {course.seatLimit ? ` / ${formatNumber(course.seatLimit)}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Price</span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  {course.priceCents === 0 ? 'Included in plan' : formatCurrency(course.priceCents)}
                </span>
              </div>
            </CardContent>
          </Card>

          {course.enrollment ? (
            <Card>
              <CardHeader title="Your progress" />
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <StatusBadge status={course.enrollment.status} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {course.enrollment.progress_pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, course.enrollment.progress_pct)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <EditCourseModal course={course} open={editing} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}
