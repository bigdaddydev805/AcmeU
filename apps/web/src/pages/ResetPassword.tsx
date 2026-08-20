import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password/reset', { token, password });
      toast.success('Password updated', 'You can sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'This reset link is no longer valid.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Reset links expire one hour after they are requested.
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

        {!searchParams.get('token') ? (
          <Input
            label="Reset token"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste the token from your email"
          />
        ) : null}

        <Input
          label="New password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          hint="At least 12 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Input
          label="Confirm new password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Update password
        </Button>
      </form>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
