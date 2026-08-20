import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, KeyRound, Lock } from 'lucide-react';
import { Button } from '../components/Button';
import { Checkbox, Input } from '../components/Input';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [tenant, setTenant] = useState(searchParams.get('tenant') ?? '');
  const [rememberMe, setRememberMe] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(searchParams.get('tenant')));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, otp, rememberMe, tenant });
      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'We could not sign you in with those details.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Sign in to your workspace
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Use your work account to continue to AcmeU.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {error}
          </div>
        ) : null}

        <Input
          label="Work email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          leadingIcon={<AtSign className="h-4 w-4" />}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          leadingIcon={<Lock className="h-4 w-4" />}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        <Input
          label="Verification code"
          hint="Only required if two-factor authentication is enabled."
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          leadingIcon={<KeyRound className="h-4 w-4" />}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="123456"
        />

        {showAdvanced ? (
          <Input
            label="Workspace"
            hint="Only needed when your email belongs to more than one workspace."
            value={tenant}
            onChange={(event) => setTenant(event.target.value)}
            placeholder="acme-corp"
          />
        ) : null}

        <div className="flex items-center justify-between">
          <Checkbox
            label="Keep me signed in"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Sign in
        </Button>

        {!showAdvanced ? (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Sign in to a specific workspace
          </button>
        ) : null}
      </form>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        New to AcmeU?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Create an account
        </Link>
      </p>
    </div>
  );
}
