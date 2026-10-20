import { CheckCircle2, Eye, EyeOff, MailCheck, TimerOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage } from '@/shared/api/http';
import { Button, Field, FormError, InlineAlert, Input, Skeleton } from '@/shared/ui';
import { ROLE_HOME, ROLE_LABEL } from '@/features/auth/session-store';
import { useAcceptInvitation, useInvitation, useResendInvitation } from '@/features/auth/api';
import type { Role } from '@/shared/types/api';
import { AuthLayout, AuthQuote } from './auth-layout';

function ResendForm({ initialEmail = '', headline }: { initialEmail?: string; headline?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const resend = useResendInvitation();
  if (resend.isSuccess) {
    return (
      <InlineAlert tone="success" icon={<MailCheck />} title="Check your inbox">
        If an invitation is waiting for {email}, a new link and temporary password are on their way. The old ones no longer work.
      </InlineAlert>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        resend.mutate(email.trim());
      }}
      className="space-y-4"
    >
      {headline && <p className="text-sm text-muted">{headline}</p>}
      <Field label="Your email">
        <Input type="email" inputSize="lg" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>
      <FormError message={resend.error ? errorMessage(resend.error) : null} />
      <Button type="submit" size="lg" className="w-full" loading={resend.isPending} disabled={!email.includes('@')}>
        Send a new invitation
      </Button>
    </form>
  );
}

/**
 * /invite/:token — staff invitation. The link works once: choosing a password here
 * signs you in and burns the link. /invite/resend asks for a fresh one.
 */
export default function InvitePage() {
  const token = useParams().token ?? '';
  const isResend = token === 'resend';
  const invite = useInvitation(isResend ? '' : token);
  const accept = useAcceptInvitation();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    document.title = 'Accept invitation · VolunTrack';
  }, []);

  const i = invite.data;
  const mismatch = pw2.length > 0 && pw !== pw2;

  return (
    <AuthLayout aside={<AuthQuote />}>
      <p className="type-eyebrow mb-4">Invitation</p>
      {isResend ? (
        <>
          <h1 className="type-headline text-[32px] text-text">Get a new invitation link</h1>
          <p className="mt-2 mb-8 text-[15px] text-muted">Invitation links work once and expire after 3 days. Enter the email you were invited with.</p>
          <ResendForm />
        </>
      ) : invite.isLoading ? (
        <Skeleton className="h-64" />
      ) : invite.error || !i ? (
        <>
          <h1 className="type-headline text-[32px] text-text">This link isn’t valid</h1>
          <p className="mt-2 mb-8 text-[15px] text-muted">It may be incomplete. Ask for a new one below.</p>
          <ResendForm />
        </>
      ) : !i.usable ? (
        <>
          <div className="mb-4 grid size-12 place-items-center rounded-full bg-warning-soft text-warning-text">
            <TimerOff className="size-6" />
          </div>
          <h1 className="type-headline text-[32px] text-text">{i.reason === 'used' ? 'This invitation was already used' : 'This invitation expired'}</h1>
          <p className="mt-2 mb-8 text-[15px] text-muted">
            {i.reason === 'used' ? 'You can sign in with the password you chose.' : 'We can send you a fresh link.'}
          </p>
          {i.reason === 'used' ? (
            <Button asChild size="lg" className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          ) : (
            <ResendForm initialEmail={i.email} />
          )}
        </>
      ) : (
        <>
          <h1 className="type-headline text-[32px] text-text">Welcome, {i.first_name ?? i.full_name}</h1>
          <p className="mt-2 text-[15px] text-muted">
            You’re joining <span className="font-medium text-text">{i.organization ?? 'VolunTrack'}</span> as {ROLE_LABEL[i.role as Role]?.toLowerCase() ?? i.role}. Choose your
            password to finish.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate({ token, password: pw }, { onSuccess: (r) => navigate(ROLE_HOME[r.user.role], { replace: true }) });
            }}
          >
            <Field label="Email">
              <Input inputSize="lg" value={i.email} readOnly className="text-muted" />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <Input
                inputSize="lg"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                trailing={
                  <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-md text-faint hover:text-text" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff /> : <Eye />}
                  </button>
                }
              />
            </Field>
            <Field label="Repeat password" error={mismatch ? 'Passwords don’t match.' : undefined}>
              <Input inputSize="lg" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </Field>
            <FormError message={accept.error ? errorMessage(accept.error) : null} />
            <Button type="submit" size="lg" className="w-full" loading={accept.isPending} disabled={pw.length < 8 || pw !== pw2}>
              <CheckCircle2 /> Set password & continue
            </Button>
            <p className="text-center text-[12.5px] text-faint">This link works once and expires {new Date(i.expires_at).toLocaleString()}.</p>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
