import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Award,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Compass,
  CreditCard,
  FileBarChart,
  Flag,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Search,
  Settings as SettingsIcon,
  Sun,
  Users,
  Webhook as WebhookIcon,
  X,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { titleCase } from '../lib/format';
import { atLeast, type NotificationsResponse, type Role } from '../lib/types';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  minimum?: Role;
  end?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Learning',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Catalog', to: '/catalog', icon: <Compass className="h-4 w-4" />, end: true },
      { label: 'My learning', to: '/learning', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Certificates', to: '/certificates', icon: <Award className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Teaching',
    items: [
      {
        label: 'Grading queue',
        to: '/grading',
        icon: <ClipboardCheck className="h-4 w-4" />,
        minimum: 'instructor',
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Reports', to: '/reports', icon: <FileBarChart className="h-4 w-4" />, minimum: 'manager' },
      {
        label: 'Integrations',
        to: '/integrations',
        icon: <GraduationCap className="h-4 w-4" />,
        minimum: 'manager',
        end: true,
      },
      {
        label: 'Webhooks',
        to: '/integrations/webhooks',
        icon: <WebhookIcon className="h-4 w-4" />,
        minimum: 'manager',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'People', to: '/admin/users', icon: <Users className="h-4 w-4" />, minimum: 'manager' },
      { label: 'API keys', to: '/admin/api-keys', icon: <KeyRound className="h-4 w-4" />, minimum: 'manager' },
      { label: 'Feature flags', to: '/admin/flags', icon: <Flag className="h-4 w-4" />, minimum: 'admin' },
      { label: 'Audit log', to: '/admin/audit', icon: <ScrollText className="h-4 w-4" />, minimum: 'admin' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', to: '/billing', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Notifications', to: '/notifications', icon: <Bell className="h-4 w-4" /> },
      { label: 'Settings', to: '/settings', icon: <SettingsIcon className="h-4 w-4" /> },
    ],
  },
];

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white',
        )
      }
    >
      <span className="shrink-0">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

function Sidebar({ role, onNavigate }: { role: string | undefined; onNavigate?: () => void }) {
  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.minimum || atLeast(role, item.minimum)),
      })).filter((section) => section.items.length > 0),
    [role],
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4">
      <Link to="/dashboard" className="flex items-center gap-2 px-2" onClick={onNavigate}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          A
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          AcmeU
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.label}
            </p>
            {section.items.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.displayName} src={profile?.avatarUrl} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">
            {user?.displayName ?? 'Account'}
          </span>
          <span className="block text-xs leading-tight text-slate-500 dark:text-slate-400">
            {titleCase(user?.role ?? '')}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 animate-slide-up overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-popover dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user?.displayName}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Your profile
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationsBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      getJson<NotificationsResponse>('/notifications', {
        params: { unreadOnly: 'true', pageSize: 1 },
      }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unread = data?.unread ?? 0;

  return (
    <Link
      to="/notifications"
      className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}

function GlobalSearch() {
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  return (
    <form
      className="hidden flex-1 md:block"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(`/catalog?q=${encodeURIComponent(term.trim())}`);
      }}
    >
      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search the catalog"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900"
        />
      </label>
    </form>
  );
}

export function AppShell() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900/60">
        <div className="sticky top-0 h-screen">
          <Sidebar role={user?.role} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-in-right border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar role={user?.role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            <GlobalSearch />

            <div className="ml-auto flex items-center gap-1.5">
              {profile ? (
                <Badge tone="accent" className="hidden lg:inline-flex">
                  {titleCase(profile.role)}
                </Badge>
              ) : null}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <NotificationsBell />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200 px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8 dark:border-slate-800 dark:text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Acme Corporation</span>
            <span>AcmeU console {import.meta.env.VITE_APP_VERSION ?? '3.14.2'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
