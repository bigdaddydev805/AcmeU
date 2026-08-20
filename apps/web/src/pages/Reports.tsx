import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Download, Play, Save, Table2, Trash2 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardFooter, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Select } from '../components/Select';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { formatDateTime, titleCase } from '../lib/format';
import type { Envelope, ReportDataset, ReportResult, SavedReport } from '../lib/types';

function TokenPicker({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 ? (
          <span className="text-xs text-slate-400">Select a dataset first.</span>
        ) : (
          options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                selected.includes(option)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {option}
            </button>
          ))
        )}
      </div>
      {hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ResultTable({ result }: { result: ReportResult }) {
  const columns: Array<Column<Record<string, unknown>>> = result.columns.map((column) => ({
    key: column,
    header: column,
    render: (row) => {
      const value = row[column];
      if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
      return <span className="tabular-nums">{String(value)}</span>;
    },
  }));

  return (
    <Table
      className="rounded-none border-0 shadow-none"
      columns={columns}
      rows={result.rows}
      rowKey={(_row, index) => String(index)}
      emptyTitle="No rows returned"
      emptyDescription="Adjust the segment or filters and run the report again."
    />
  );
}

export default function Reports() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState('Untitled report');
  const [dataset, setDataset] = useState('enrollments');
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>(['count']);
  const [segment, setSegment] = useState('');
  const [schedule, setSchedule] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);

  const datasets = useQuery({
    queryKey: ['reports', 'datasets'],
    queryFn: () => getJson<Envelope<ReportDataset>>('/reports/datasets'),
  });

  const saved = useQuery({
    queryKey: ['reports', 'saved'],
    queryFn: () => getJson<Envelope<SavedReport>>('/reports'),
  });

  const spec = useMemo(
    () => (datasets.data?.data ?? []).find((entry) => entry.name === dataset),
    [datasets.data, dataset],
  );

  useEffect(() => {
    if (!spec) return;
    setDimensions((current) => current.filter((value) => spec.dimensions.includes(value)));
    setMetrics((current) => {
      const kept = current.filter((value) => spec.metrics.includes(value));
      return kept.length ? kept : spec.metrics.slice(0, 1);
    });
  }, [spec]);

  const definition = () => ({
    name,
    dataset,
    segment: segment.trim() ? segment : null,
    dimensions,
    metrics,
    filters: {},
    schedule: schedule.trim() ? schedule : null,
  });

  const preview = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ReportResult>('/reports/preview', definition());
      return data;
    },
    onSuccess: (data) => setResult(data),
    onError: (error) => toast.error('Preview failed', errorMessage(error)),
  });

  const save = useMutation({
    mutationFn: () => api.post('/reports', definition()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'saved'] });
      toast.success('Report saved', name);
    },
    onError: (error) => toast.error('Could not save the report', errorMessage(error)),
  });

  const run = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ReportResult>(`/reports/${id}/run`);
      return data;
    },
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ['reports', 'saved'] });
    },
    onError: (error) => toast.error('Report run failed', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'saved'] });
      toast.success('Report deleted');
    },
    onError: (error) => toast.error('Could not delete the report', errorMessage(error)),
  });

  const exportCsv = useMutation({
    mutationFn: async (report: SavedReport) => {
      const response = await api.get(`/reports/${report.id}/export`, {
        params: { limit: 5000 },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'text/csv' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${report.name.replace(/[^\w.-]/g, '_')}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error('Export failed', errorMessage(error)),
  });

  const loadSaved = (report: SavedReport) => {
    setName(report.name);
    setDataset(report.dataset);
    setDimensions(report.dimensions ?? []);
    setMetrics(report.metrics ?? ['count']);
    setSegment(report.segment ?? '');
    setSchedule(report.schedule ?? '');
  };

  const savedColumns: Array<Column<SavedReport>> = [
    {
      key: 'name',
      header: 'Report',
      render: (row) => (
        <button
          type="button"
          onClick={() => loadSaved(row)}
          className="text-left text-sm font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
        >
          {row.name}
        </button>
      ),
    },
    { key: 'dataset', header: 'Dataset', render: (row) => <Badge tone="accent">{row.dataset}</Badge> },
    {
      key: 'shape',
      header: 'Shape',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {(row.dimensions ?? []).join(', ') || 'no dimensions'} · {(row.metrics ?? []).join(', ')}
        </span>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (row) =>
        row.segment ? (
          <code className="font-mono text-xs text-slate-600 dark:text-slate-300">{row.segment}</code>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'last_run',
      header: 'Last run',
      render: (row) => (row.last_run_at ? formatDateTime(row.last_run_at) : 'Never'),
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
            icon={<Play className="h-3.5 w-3.5" />}
            loading={run.isPending && run.variables === row.id}
            onClick={() => run.mutate(row.id)}
          >
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            loading={exportCsv.isPending && exportCsv.variables?.id === row.id}
            onClick={() => exportCsv.mutate(row)}
          >
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            loading={remove.isPending && remove.variables === row.id}
            onClick={() => remove.mutate(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Build ad-hoc analyses across enrollments, submissions, learners, and revenue."
      />

      <Card>
        <CardHeader
          title="Report builder"
          description="Choose a dataset, group by dimensions, and select the metrics to aggregate."
        />
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Select
              label="Dataset"
              options={(datasets.data?.data ?? []).map((entry) => ({
                value: entry.name,
                label: titleCase(entry.name),
              }))}
              value={dataset}
              onChange={(event) => setDataset(event.target.value)}
            />
            <Input
              label="Schedule"
              hint="Optional cron expression for automated runs."
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              placeholder="0 7 * * 1"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TokenPicker
              label="Dimensions"
              hint="Rows are grouped by the dimensions you select."
              options={spec?.dimensions ?? []}
              selected={dimensions}
              onToggle={(value) =>
                setDimensions((current) =>
                  current.includes(value)
                    ? current.filter((entry) => entry !== value)
                    : [...current, value],
                )
              }
            />
            <TokenPicker
              label="Metrics"
              hint="At least one metric is required."
              options={spec?.metrics ?? []}
              selected={metrics}
              onToggle={(value) =>
                setMetrics((current) =>
                  current.includes(value)
                    ? current.filter((entry) => entry !== value)
                    : [...current, value],
                )
              }
            />
          </div>

          <Textarea
            label="Segment"
            hint="Boolean expression appended to the report's WHERE clause, for example: e.progress_pct > 50 AND c.category = 'security'"
            monospace
            rows={3}
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
            placeholder="e.status = 'active'"
          />
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            loading={save.isPending}
            disabled={metrics.length === 0 || !name.trim()}
            onClick={() => save.mutate()}
          >
            Save report
          </Button>
          <Button
            icon={<Table2 className="h-4 w-4" />}
            loading={preview.isPending}
            disabled={metrics.length === 0}
            onClick={() => preview.mutate()}
          >
            Run preview
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader
          title="Results"
          description={
            result?.ranAt
              ? `${result.rows.length} rows · generated ${formatDateTime(result.ranAt)}`
              : result
                ? `${result.rows.length} rows`
                : 'Run a preview to see results.'
          }
        />
        <CardContent className="p-0">
          {preview.isError ? (
            <div className="p-5">
              <ErrorState title="The report did not run" description={errorMessage(preview.error)} />
            </div>
          ) : result ? (
            <ResultTable result={result} />
          ) : (
            <div className="p-5">
              <EmptyState
                title="No results yet"
                description="Configure the builder above and run a preview."
                icon={<Table2 className="h-5 w-5" />}
                className="border-0 bg-transparent"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Saved reports" description="Shared with everyone in your workspace." />
        <CardContent className="p-0">
          {saved.isError ? (
            <div className="p-5">
              <ErrorState description={errorMessage(saved.error)} />
            </div>
          ) : (
            <Table
              className="rounded-none border-0 shadow-none"
              columns={savedColumns}
              rows={saved.data?.data ?? []}
              rowKey={(row) => row.id}
              loading={saved.isLoading}
              emptyTitle="No saved reports"
              emptyDescription="Save a report to run it again later or schedule it."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
