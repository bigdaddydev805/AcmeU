import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShieldCheck, Sparkles, Users } from 'lucide-react';

const HIGHLIGHTS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: 'Programs that adapt',
    body: 'Blend cohorts, self-paced modules, and assessments in a single learning path.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Verifiable credentials',
    body: 'Issue signed certificates your partners and regulators can verify in seconds.',
  },
  {
    icon: <Users className="h-4 w-4" />,
    title: 'Built for scale',
    body: 'Multi-tenant workspaces, SSO, roster sync, and role-scoped administration.',
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2 dark:bg-slate-950">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/login" className="mb-8 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              AcmeU
            </span>
          </Link>
          <Outlet />
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-slate-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center gap-10 px-14 py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Learning &amp; credentialing
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-white">
              Train your workforce and prove it — in one workspace.
            </h2>
          </div>

          <ul className="space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-200">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-300">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-400">
            Trusted by operations, compliance, and enablement teams at 400+ organizations.
          </p>
        </div>
      </div>
    </div>
  );
}
