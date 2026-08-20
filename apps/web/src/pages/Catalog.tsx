import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Clock, Search, SlidersHorizontal, Star, Users } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { Pagination } from '../components/Pagination';
import { Select } from '../components/Select';
import { getJson } from '../lib/api';
import { formatCurrency, formatDuration, formatNumber, titleCase } from '../lib/format';
import type { Course, Paginated } from '../lib/types';

const CATEGORIES = [
  'compliance',
  'engineering',
  'leadership',
  'security',
  'operations',
  'product',
  'sales',
];

const LEVELS = ['foundation', 'practitioner', 'advanced'];

const SORTS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'newest', label: 'Recently published' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'popularity', label: 'Most enrolled' },
  { value: 'duration', label: 'Shortest first' },
  { value: 'price', label: 'Lowest price' },
];

const PAGE_SIZE = 12;

function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      to={`/catalog/${course.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-popover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
    >
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-indigo-500/90 via-indigo-500 to-sky-500">
        {course.heroImageUrl ? (
          <img
            src={course.heroImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute left-3 top-3">
          <Badge tone="neutral" className="bg-white/90 text-slate-700 ring-white/60">
            {course.code}
          </Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
            {course.title}
          </h3>
          {course.subtitle ? (
            <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{course.subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{titleCase(course.category)}</Badge>
          <Badge tone="neutral">{titleCase(course.level)}</Badge>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {course.ratingAvg.toFixed(1)}
            <span className="text-slate-400">({formatNumber(course.ratingCount)})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(course.durationMins)}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {course.priceCents === 0 ? 'Included' : formatCurrency(course.priceCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = useMemo(
    () => ({
      page: Number(searchParams.get('page') ?? '1'),
      pageSize: PAGE_SIZE,
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      level: searchParams.get('level') ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      minRating: searchParams.get('minRating') ?? undefined,
      sort: searchParams.get('sort') ?? 'relevance',
      direction: searchParams.get('direction') ?? 'desc',
    }),
    [searchParams],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['courses', params],
    queryFn: () => getJson<Paginated<Course>>('/courses', { params }),
    placeholderData: keepPreviousData,
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    updateParam('q', term.trim());
  };

  const courses = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Course catalog"
        description="Browse programs available to your workspace."
        action={
          <Button
            variant="outline"
            icon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            Filters
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-3" onSubmit={onSearch}>
            <Input
              containerClassName="min-w-[220px] flex-1"
              label="Search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              leadingIcon={<Search className="h-4 w-4" />}
              placeholder="Search by title or subtitle"
            />
            <Select
              containerClassName="w-44"
              label="Sort by"
              options={SORTS}
              value={params.sort}
              onChange={(event) => updateParam('sort', event.target.value)}
            />
            <Select
              containerClassName="w-36"
              label="Direction"
              options={[
                { value: 'desc', label: 'Descending' },
                { value: 'asc', label: 'Ascending' },
              ]}
              value={params.direction}
              onChange={(event) => updateParam('direction', event.target.value)}
            />
            <Button type="submit">Search</Button>
          </form>

          {filtersOpen ? (
            <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
              <Select
                label="Category"
                placeholder="All categories"
                options={CATEGORIES.map((value) => ({ value, label: titleCase(value) }))}
                value={params.category ?? ''}
                onChange={(event) => updateParam('category', event.target.value)}
              />
              <Select
                label="Level"
                placeholder="All levels"
                options={LEVELS.map((value) => ({ value, label: titleCase(value) }))}
                value={params.level ?? ''}
                onChange={(event) => updateParam('level', event.target.value)}
              />
              <Input
                label="Tag"
                placeholder="e.g. onboarding"
                defaultValue={params.tag ?? ''}
                onBlur={(event) => updateParam('tag', event.target.value.trim())}
              />
              <Select
                label="Minimum rating"
                placeholder="Any rating"
                options={['3', '3.5', '4', '4.5'].map((value) => ({
                  value,
                  label: `${value}+ stars`,
                }))}
                value={params.minRating ?? ''}
                onChange={(event) => updateParam('minRating', event.target.value)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isError ? (
        <ErrorState description={(error as Error)?.message} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses match those filters"
          description="Try widening your search or clearing the filters."
          icon={<Search className="h-5 w-5" />}
          action={
            <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <Pagination
            page={data?.page ?? 1}
            pageSize={data?.pageSize ?? PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={(page) => updateParam('page', String(page))}
          />
        </>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Users className="h-3.5 w-3.5" />
        Seat availability is refreshed every minute.
      </p>
    </>
  );
}
