import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api, errorMessage } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/password/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'We could not start the reset process.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          <MailCheck className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Check your inbox
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          If an account exists for <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>,
          we have sent a reset link. It expires in 60 minutes.
        </p>
        <Link
          to="/login"
          className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Enter your work email and we will send you a link to choose a new password.
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
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
