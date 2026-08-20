import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, ExternalLink, Eye, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Checkbox, Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { API_BASE_URL, api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/format';
import {
  atLeast,
  type AdminUser,
  type Certificate,
  type CertificateTemplate,
  type Course,
  type Envelope,
  type Paginated,
} from '../lib/types';

const STARTER_TEMPLATE = `<section class="certificate">
  <h1>Certificate of Completion</h1>
  <p class="awarded">This certifies that</p>
  <h2><%= data.learner.name %></h2>
  <p>has successfully completed</p>
  <h3><%= data.course.title %> (<%= data.course.code %>)</h3>
  <p class="issued">Issued on <%= data.issuedOn %> by <%= data.tenant.name %></p>
  <p class="serial">Serial <%= data.serial %></p>
</section>`;

function TemplateStudio() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState('Completion certificate');
  const [orientation, setOrientation] = useState('landscape');
  const [isDefault, setIsDefault] = useState(false);
  const [bodyHtml, setBodyHtml] = useState(STARTER_TEMPLATE);
  const [previewHtml, setPreviewHtml] = useState('');

  const templates = useQuery({
    queryKey: ['credential-templates'],
    queryFn: () => getJson<Envelope<CertificateTemplate>>('/credentials/templates'),
  });

  const preview = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<string>(
        '/credentials/templates/preview',
        { bodyHtml },
        { responseType: 'text' },
      );
      return data;
    },
    onSuccess: (html) => setPreviewHtml(html),
    onError: (error) => toast.error('Preview failed', errorMessage(error)),
  });

  const save = useMutation({
    mutationFn: () => api.post('/credentials/templates', { name, bodyHtml, orientation, isDefault }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['credential-templates'] });
      toast.success('Template saved', name);
    },
    onError: (error) => toast.error('Could not save the template', errorMessage(error)),
  });

  return (
    <Card>
      <CardHeader
        title="Certificate templates"
        description="Design the credential learners receive when they complete a course."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            loading={preview.isPending}
            onClick={() => preview.mutate()}
          >
            Preview
          </Button>
        }
      />
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Template name" value={name} onChange={(event) => setName(event.target.value)} />
          <Select
            label="Orientation"
            options={[
              { value: 'landscape', label: 'Landscape' },
              { value: 'portrait', label: 'Portrait' },
            ]}
            value={orientation}
            onChange={(event) => setOrientation(event.target.value)}
          />
          <div className="flex items-end pb-2">
            <Checkbox
              label="Use as workspace default"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="Template body"
            hint="HTML with template placeholders such as data.learner.name and data.course.title."
            monospace
            rows={16}
            value={bodyHtml}
            onChange={(event) => setBodyHtml(event.target.value)}
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Live preview</p>
            <div className="h-[22rem] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700">
              {previewHtml ? (
                <iframe
                  title="Certificate preview"
                  srcDoc={previewHtml}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                  Select Preview to render the template with sample learner data.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {(templates.data?.data ?? []).map((template) => (
              <Badge key={template.id} tone={template.is_default ? 'success' : 'neutral'}>
                {template.name}
                {template.is_default ? ' · default' : ''}
              </Badge>
            ))}
          </div>
          <Button loading={save.isPending} disabled={!bodyHtml.trim()} onClick={() => save.mutate()}>
            Save template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCertificateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [templateId, setTemplateId] = useState('');

  const users = useQuery({
    queryKey: ['admin', 'users', ''],
    queryFn: () => getJson<Envelope<AdminUser>>('/admin/users'),
    enabled: open,
  });

  const courses = useQuery({
    queryKey: ['courses', { pageSize: 100, sort: 'title', direction: 'asc' }],
    queryFn: () =>
      getJson<Paginated<Course>>('/courses', {
        params: { pageSize: 100, sort: 'title', direction: 'asc' },
      }),
    enabled: open,
  });

  const templates = useQuery({
    queryKey: ['credential-templates'],
    queryFn: () => getJson<Envelope<CertificateTemplate>>('/credentials/templates'),
    enabled: open,
  });

  const issue = useMutation({
    mutationFn: () =>
      api.post('/credentials/issue', {
        userId,
        courseId,
        templateId: templateId || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Certificate issued');
      onClose();
    },
    onError: (error) => toast.error('Could not issue the certificate', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue a certificate"
      description="Certificates are rendered from the selected template and given a verifiable serial."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={issue.isPending}
            disabled={!userId || !courseId}
            onClick={() => issue.mutate()}
          >
            Issue certificate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Learner"
          placeholder="Select a learner"
          options={(users.data?.data ?? []).map((user) => ({
            value: user.id,
            label: `${user.display_name} (${user.email})`,
          }))}
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
        <Select
          label="Course"
          placeholder="Select a course"
          options={(courses.data?.data ?? []).map((course) => ({
            value: course.id,
            label: `${course.code} — ${course.title}`,
          }))}
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
        />
        <Select
          label="Template"
          placeholder="Workspace default"
          options={(templates.data?.data ?? []).map((template) => ({
            value: template.id,
            label: template.name,
          }))}
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function Certificates() {
  const { user } = useAuth();
  const [issuing, setIssuing] = useState(false);

  const canAuthorTemplates = atLeast(user?.role, 'instructor');
  const canIssue = atLeast(user?.role, 'manager');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => getJson<Envelope<Certificate>>('/credentials'),
  });

  const openCertificate = (certificate: Certificate) => {
    window.open(`${API_BASE_URL}/credentials/${certificate.id}/render`, '_blank', 'noopener');
  };

  const columns: Array<Column<Certificate>> = [
    {
      key: 'course',
      header: 'Course',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {row.course_title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'serial',
      header: 'Serial',
      render: (row) => <span className="font-mono text-xs">{row.serial}</span>,
    },
    { key: 'issued', header: 'Issued', render: (row) => formatDate(row.issued_at) },
    {
      key: 'expires',
      header: 'Expires',
      render: (row) =>
        row.expires_at ? (
          formatDate(row.expires_at)
        ) : (
          <Badge tone="success">Does not expire</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={<ExternalLink className="h-3.5 w-3.5" />}
          onClick={() => openCertificate(row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Credentials issued to you, and the templates your workspace uses."
        action={
          canIssue ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIssuing(true)}>
              Issue certificate
            </Button>
          ) : null
        }
      />

      {isError ? (
        <ErrorState description={errorMessage(error)} />
      ) : !isLoading && (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="Complete a course to earn your first verifiable credential."
          icon={<Award className="h-5 w-5" />}
        />
      ) : (
        <Table
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isLoading}
          emptyTitle="No certificates yet"
        />
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Anyone can confirm a credential at /credentials/verify using its serial number.
      </p>

      {canAuthorTemplates ? <TemplateStudio /> : null}
      {canIssue ? <IssueCertificateModal open={issuing} onClose={() => setIssuing(false)} /> : null}
    </>
  );
}
