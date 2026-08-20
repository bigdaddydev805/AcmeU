import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(searchParams.get('workspace') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, displayName, tenantSlug });
      toast.success('Welcome to AcmeU', 'Your account is ready.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'We could not create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Join your organization&apos;s learning workspace.
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
          label="Full name"
          required
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Alex Rivera"
        />

        <Input
          label="Work email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
          hint="At least 12 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••••"
        />

        <Input
          label="Workspace"
          required
          hint="The workspace identifier your administrator shared with you."
          value={tenantSlug}
          onChange={(event) => setTenantSlug(event.target.value)}
          placeholder="acme-corp"
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
