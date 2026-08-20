import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { ErrorState } from '../components/EmptyState';
import { Markdown } from '../components/Markdown';
import { SkeletonCard } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDuration, titleCase } from '../lib/format';
import type { CourseDetail, LessonDetail } from '../lib/types';

export default function LessonViewer() {
  const { courseId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
  }, [lessonId]);

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getJson<CourseDetail>(`/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  const lesson = useQuery({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: () => getJson<LessonDetail>(`/courses/${courseId}/lessons/${lessonId}`),
    enabled: Boolean(courseId && lessonId),
  });

  const orderedLessons = useMemo(
    () =>
      (course.data?.modules ?? []).flatMap((module) =>
        module.lessons.map((entry) => ({ ...entry, moduleTitle: module.title })),
      ),
    [course.data],
  );

  const currentIndex = orderedLessons.findIndex((entry) => entry.id === lessonId);
  const previous = currentIndex > 0 ? orderedLessons[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 ? orderedLessons[currentIndex + 1] : undefined;
  const enrollmentId = course.data?.enrollment?.id;

  const markComplete = useMutation({
    mutationFn: () => {
      if (!enrollmentId) throw new Error('You are not enrolled in this course');
      const secondsSpent = Math.min(86_400, Math.round((Date.now() - startedAt.current) / 1000));
      return api.post(`/enrollments/${enrollmentId}/progress`, {
        lessonId,
        state: 'completed',
        secondsSpent,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Lesson marked complete');
      if (next) navigate(`/catalog/${courseId}/lessons/${next.id}`);
    },
    onError: (error) => toast.error('Could not save progress', errorMessage(error)),
  });

  if (lesson.isLoading) {
    return <SkeletonCard rows={8} />;
  }

  if (lesson.isError || !lesson.data) {
    return (
      <ErrorState
        title="Lesson unavailable"
        description={errorMessage(lesson.error, 'You may need to enroll before viewing this lesson.')}
        action={
          <Link
            to={`/catalog/${courseId}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Back to course
          </Link>
        }
      />
    );
  }

  const data = lesson.data;

  return (
    <>
      <PageHeader
        title={data.title}
        description={
          course.data ? (
            <Link
              to={`/catalog/${courseId}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {course.data.title}
            </Link>
          ) : null
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<MessageSquare className="h-4 w-4" />}
              onClick={() => navigate(`/courses/${courseId}/discussion`)}
            >
              Ask a question
            </Button>
            <Button
              icon={<CheckCircle2 className="h-4 w-4" />}
              loading={markComplete.isPending}
              disabled={!enrollmentId}
              onClick={() => markComplete.mutate()}
            >
              Mark complete
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {data.mediaUrl ? (
            <Card className="overflow-hidden">
              <video controls className="aspect-video w-full bg-black" src={data.mediaUrl} />
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title={`${titleCase(data.kind)} lesson`}
              description={formatDuration(data.durationMins)}
              action={data.isPreview ? <Badge tone="success">Preview</Badge> : null}
            />
            <CardContent>
              <Markdown html={data.bodyHtml} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              disabled={!previous}
              onClick={() => previous && navigate(`/catalog/${courseId}/lessons/${previous.id}`)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!next}
              onClick={() => next && navigate(`/catalog/${courseId}/lessons/${next.id}`)}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader title="Lessons" description={`${orderedLessons.length} in this course`} />
          <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto">
            {orderedLessons.map((entry, index) => (
              <Link
                key={entry.id}
                to={`/catalog/${courseId}/lessons/${entry.id}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  entry.id === lessonId
                    ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="w-5 shrink-0 text-xs text-slate-400">{index + 1}</span>
                <span className="truncate">{entry.title}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
