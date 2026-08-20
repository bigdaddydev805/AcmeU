import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, MessageSquare, Pin, Send, Trash2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Textarea } from '../components/Input';
import { Markdown, MarkdownPreview } from '../components/Markdown';
import { SkeletonCard } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatTimeAgo } from '../lib/format';
import { atLeast, type CourseDetail, type DiscussionPost, type Envelope } from '../lib/types';

interface ComposerProps {
  courseId: string;
  parentId?: string | null;
  placeholder?: string;
  onDone?: () => void;
  compact?: boolean;
}

function Composer({ courseId, parentId = null, placeholder, onDone, compact }: ComposerProps) {
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/discussion`, { bodyMd: body, parentId }),
    onSuccess: async () => {
      setBody('');
      setPreview(false);
      await queryClient.invalidateQueries({ queryKey: ['discussion', courseId] });
      onDone?.();
    },
    onError: (error) => toast.error('Could not post', errorMessage(error)),
  });

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <MarkdownPreview source={body} />
        </div>
      ) : (
        <Textarea
          rows={compact ? 3 : 4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder ?? 'Share an insight or ask a question. Markdown is supported.'}
        />
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => setPreview((value) => !value)}
        >
          {preview ? 'Edit' : 'Preview'}
        </Button>
        <Button
          size="sm"
          icon={<Send className="h-3.5 w-3.5" />}
          loading={mutation.isPending}
          disabled={!body.trim()}
          onClick={() => mutation.mutate()}
        >
          Post
        </Button>
      </div>
    </div>
  );
}

function PostCard({
  post,
  replies,
  courseId,
}: {
  post: DiscussionPost;
  replies: DiscussionPost[];
  courseId: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [replying, setReplying] = useState(false);

  const canModerate = atLeast(user?.role, 'instructor');
  const canDelete = canModerate || post.author.id === user?.id;

  const pin = useMutation({
    mutationFn: () => api.post(`/discussion/${post.id}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discussion', courseId] }),
    onError: (error) => toast.error('Could not update the post', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/discussion/${post.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discussion', courseId] });
      toast.success('Post removed');
    },
    onError: (error) => toast.error('Could not remove the post', errorMessage(error)),
  });

  return (
    <Card className={post.pinned ? 'border-indigo-200 dark:border-indigo-500/40' : undefined}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar name={post.author.displayName} src={post.author.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/profile/${post.author.id}`}
                className="text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                {post.author.displayName}
              </Link>
              {post.author.title ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">{post.author.title}</span>
              ) : null}
              <span className="text-xs text-slate-400">· {formatTimeAgo(post.createdAt)}</span>
              {post.pinned ? <Badge tone="accent">Pinned</Badge> : null}
            </div>
            <div className="mt-2">
              <Markdown html={post.bodyHtml} />
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setReplying((value) => !value)}>
                Reply
              </Button>
              {canModerate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pin className="h-3.5 w-3.5" />}
                  loading={pin.isPending}
                  onClick={() => pin.mutate()}
                >
                  {post.pinned ? 'Unpin' : 'Pin'}
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  loading={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {replying ? (
          <div className="ml-11 border-l border-slate-200 pl-4 dark:border-slate-800">
            <Composer
              courseId={courseId}
              parentId={post.id}
              compact
              placeholder={`Reply to ${post.author.displayName}`}
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}

        {replies.length > 0 ? (
          <div className="ml-11 space-y-4 border-l border-slate-200 pl-4 dark:border-slate-800">
            {replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3">
                <Avatar name={reply.author.displayName} src={reply.author.avatarUrl} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {reply.author.displayName}
                    </span>
                    <span className="text-xs text-slate-400">· {formatTimeAgo(reply.createdAt)}</span>
                  </div>
                  <Markdown html={reply.bodyHtml} className="mt-1 text-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Discussion() {
  const { courseId = '' } = useParams();

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getJson<CourseDetail>(`/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  const discussion = useQuery({
    queryKey: ['discussion', courseId],
    queryFn: () => getJson<Envelope<DiscussionPost>>(`/courses/${courseId}/discussion`),
    enabled: Boolean(courseId),
  });

  const { roots, repliesByParent } = useMemo(() => {
    const posts = discussion.data?.data ?? [];
    const byParent = new Map<string, DiscussionPost[]>();
    const top: DiscussionPost[] = [];

    for (const post of posts) {
      if (post.parentId) {
        const bucket = byParent.get(post.parentId) ?? [];
        bucket.push(post);
        byParent.set(post.parentId, bucket);
      } else {
        top.push(post);
      }
    }

    return { roots: top, repliesByParent: byParent };
  }, [discussion.data]);

  return (
    <>
      <PageHeader
        title="Discussion"
        description={
          course.data ? (
            <Link
              to={`/catalog/${courseId}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {course.data.title}
            </Link>
          ) : (
            'Course conversation'
          )
        }
      />

      <Card>
        <CardHeader title="Start a thread" />
        <CardContent>
          <Composer courseId={courseId} />
        </CardContent>
      </Card>

      {discussion.isLoading ? (
        <div className="space-y-4">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
      ) : discussion.isError ? (
        <ErrorState
          title="Discussion unavailable"
          description={errorMessage(discussion.error, 'Enrollment is required to view this discussion.')}
        />
      ) : roots.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Be the first to start the conversation for this course."
          icon={<MessageSquare className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-4">
          {roots.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              replies={repliesByParent.get(post.id) ?? []}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </>
  );
}
