import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, isApiError } from '@/shared/api/http';
import { Button, Field, FormError, Input, notify } from '@/shared/ui';
import { useChangePassword, useLogout } from '@/features/auth/api';
import { useSession } from '@/features/auth/use-session';
import { ROLE_HOME } from '@/features/auth/session-store';
import { AuthLayout, AuthQuote } from './auth-layout';

/** First sign-in with an invitation's temporary password: choose your own before anything else. */
export default function ForcePasswordPage() {
  const { user, role } = useSession();
  const change = useChangePassword();
  const logout = useLogout();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    document.title = 'Choose your password · VolunTrack';
  }, []);
  useEffect(() => {
    if (user && !user.must_change_password && role) navigate(ROLE_HOME[role], { replace: true });
  }, [user, role, navigate]);

  const err = change.error;
  const currentError = isApiError(err) ? err.field('current_password') : undefined;

  return (
    <AuthLayout aside={<AuthQuote />}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
        <KeyRound className="size-6" />
      </div>
      <p className="type-eyebrow mb-3">One more step</p>
      <h1 className="type-headline text-[32px] text-text">Choose your own password</h1>
      <p className="mt-2 text-[15px] text-muted">You signed in with the temporary password from your invitation email. Replace it to continue{user ? `, ${user.first_name ?? user.full_name}` : ''}.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate(
            { current_password: current, password: pw, password_confirmation: pw2 },
            {
              onSuccess: () => {
                notify.success('Password saved');
                navigate(role ? ROLE_HOME[role] : '/app', { replace: true });
              },
            },
          );
        }}
      >
        <Field label="Temporary password (from the email)" error={currentError}>
          <Input inputSize="lg" type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 8 characters, different from the temporary one.">
          <Input
            inputSize="lg"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            trailing={
              <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-md text-faint hover:text-text" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>
        <Field label="Repeat new password" error={pw2 && pw !== pw2 ? 'Passwords don’t match.' : undefined}>
          <Input inputSize="lg" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        <FormError message={err && !currentError ? errorMessage(err) : null} />
        <Button type="submit" size="lg" className="w-full" loading={change.isPending} disabled={!current || pw.length < 8 || pw !== pw2}>
          Save and continue
        </Button>
        <button type="button" onClick={() => logout.mutate()} className="w-full text-center text-sm text-muted hover:text-text">
          Sign out
        </button>
      </form>
    </AuthLayout>
  );
}
