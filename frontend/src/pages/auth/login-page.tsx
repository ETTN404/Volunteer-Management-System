import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button, Field, FormError, InlineAlert, Input } from '@/shared/ui';
import { errorMessage, isApiError } from '@/shared/api/http';
import { env } from '@/shared/config/env';
import { useLogin } from '@/features/auth/api';
import { ROLE_HOME, ROLE_LABEL } from '@/features/auth/session-store';
import type { Role } from '@/shared/types/api';
import { AuthLayout, AuthQuote } from './auth-layout';
import { useT } from '@/shared/i18n';

// Mirrors App\Http\Requests\LoginRequest (email accepts an email OR the user's full name).
const schema = z.object({
  login: z.string().trim().min(1, 'Enter your email or full name.'),
  password: z.string().min(1, 'Enter your password.'),
});
type Values = z.infer<typeof schema>;

const DEMO: { role: Role; email: string }[] = [
  { role: 'Volunteer', email: 'redcross.vol@vms.com' },
  { role: 'Coordinator', email: 'redcross.coord@vms.com' },
  { role: 'OrgAdmin', email: 'redcross.admin@vms.com' },
  { role: 'SuperAdmin', email: 'superadmin@vms.com' },
];

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const t = useT();
  const { register, handleSubmit, setValue, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { login: '', password: '' } });

  useEffect(() => {
    document.title = `${t('Sign in')} · VolunTrack`;
  }, [t]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const res = await login.mutateAsync({ login: v.login, password: v.password });
      if (res.must_change_password || res.user.must_change_password) return navigate('/welcome/password', { replace: true });
      const next = params.get('next');
      const home = ROLE_HOME[res.user.role];
      navigate(next && next.startsWith(home) ? next : home, { replace: true });
    } catch (e) {
      if (isApiError(e) && e.isValidation) setError('password', { message: e.field('email') ?? e.message });
    }
  });

  const serverError = login.error && !(isApiError(login.error) && login.error.isValidation) ? errorMessage(login.error) : null;

  return (
    <AuthLayout aside={<AuthQuote />}>
      <p className="type-eyebrow mb-4">{t('Welcome back')}</p>
      <h1 className="type-headline text-[34px] text-text">{t('Sign in to VolunTrack')}</h1>
      <p className="mt-2 text-[15px] text-muted">{t('One sign-in for volunteers, coordinators and admins.')}</p>

      {params.get('expired') && (
        <InlineAlert tone="warning" className="mt-6" title={t('Your session ended')}>
          {t('Sign in again to continue.')}
        </InlineAlert>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormError message={serverError} />
        <Field label={t('Email or full name')} error={formState.errors.login?.message && t(formState.errors.login.message)}>
          <Input inputSize="lg" autoComplete="username" autoFocus leading={<Mail />} placeholder="you@organization.org" {...register('login')} />
        </Field>
        <Field
          label={t('Password')}
          error={formState.errors.password?.message && t(formState.errors.password.message)}
          hint={capsLock ? t('Caps Lock is on') : undefined}
          aside={
            <Link to="/forgot-password" className="text-[12.5px] font-medium text-accent-text hover:underline">
              {t('Forgot password?')}
            </Link>
          }
        >
          <Input
            inputSize="lg"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            leading={<Lock />}
            onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
            trailing={
              <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-md text-faint hover:text-text" aria-label={show ? t('Hide password') : t('Show password')}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            }
            {...register('password')}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          {t('Sign in')} <ArrowRight />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('New here?')}{' '}
        <Link to="/register" className="font-medium text-accent-text hover:underline">
          {t('Create a volunteer account')}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        {t('Run an organization?')}{' '}
        <Link to="/signup/organization" className="font-medium text-accent-text hover:underline">
          {t('Register it for free')}
        </Link>
        {' · '}
        <Link to="/invite/resend" className="font-medium text-accent-text hover:underline">
          {t('Invitation expired?')}
        </Link>
      </p>

      {env.showDemoAccounts && (
        <div className="mt-10 border-t border-line pt-6">
          <p className="type-eyebrow mb-3">{t('Demo accounts · password “password”')}</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setValue('login', d.email, { shouldValidate: true });
                  setValue('password', 'password', { shouldValidate: true });
                }}
                className="rounded-lg px-3 py-2.5 text-left transition-colors [box-shadow:inset_0_0_0_1px_var(--line)] hover:bg-surface-2"
              >
                <span className="block text-[13px] font-medium text-text">{t(ROLE_LABEL[d.role])}</span>
                <span className="type-data block truncate text-[11px] text-faint">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
