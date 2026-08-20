import { useMemo } from 'react';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export interface MarkdownProps {
  /** Rendered HTML as returned by the API (`descriptionHtml`, `bodyHtml`, `specHtml`, `feedbackHtml`). */
  html: string | null | undefined;
  className?: string;
  emptyLabel?: string;
}

/**
 * Renders the HTML the API produces from stored markdown. Rendering happens
 * server-side so that lesson and discussion content looks identical in email
 * digests, exported PDFs, and the console.
 */
export function Markdown({ html, className, emptyLabel = 'No content yet.' }: MarkdownProps) {
  if (!html) {
    return <p className={clsx('text-sm text-slate-400 dark:text-slate-500', className)}>{emptyLabel}</p>;
  }

  return (
    <div className={clsx('prose max-w-none', className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export interface MarkdownPreviewProps {
  /** Raw markdown typed into a composer in the browser. */
  source: string;
  className?: string;
  emptyLabel?: string;
}

/**
 * Client-side preview for markdown that has not been through the API yet.
 */
export function MarkdownPreview({ source, className, emptyLabel = 'Nothing to preview.' }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    if (!source.trim()) return '';
    return DOMPurify.sanitize(marked.parse(source, { breaks: true }));
  }, [source]);

  if (!html) {
    return <p className={clsx('text-sm text-slate-400 dark:text-slate-500', className)}>{emptyLabel}</p>;
  }

  return (
    <div className={clsx('prose max-w-none', className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
