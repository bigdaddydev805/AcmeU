import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          A
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          We could not find that page
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The link may be outdated, or the resource may have been moved in your workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Link to="/dashboard">
            <Button icon={<Compass className="h-4 w-4" />}>Open the dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
