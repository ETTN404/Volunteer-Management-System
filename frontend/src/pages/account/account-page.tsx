import { zodResolver } from '@hookform/resolvers/zod';
import { BellRing, Camera, KeyRound, Languages, LogOut, MessageSquareText, Monitor, Moon, Palette, Send, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router';
import { z } from 'zod';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { isApiError } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Field, FormError, Input, PageHeader, Skeleton, Switch, notify } from '@/shared/ui';
import { useSession } from '@/features/auth/use-session';
import { ROLE_LABEL } from '@/features/auth/session-store';
import { useChangePassword, useLogout, useMe, useTelegramLink, useTelegramUnlink, useUpdateAccount, useUploadPhoto } from '@/features/auth/api';
import { useT } from '@/shared/i18n';
import { LanguageToggle } from '@/app/layouts/language-toggle';
import { useMarkAllNotificationsRead, useNotifications } from '@/features/notifications/api';
import { useUiStore, type ThemePref } from '@/app/ui-store';
import { useSetTheme } from '@/app/providers/theme';

const pwSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'The passwords don’t match.' })
  .refine((v) => v.password !== v.current_password, { path: ['password'], message: 'Choose a password you haven’t used here.' });

function PasswordCard() {
  const t = useT();
  const change = useChangePassword();
  const { register, handleSubmit, reset, formState, setError } = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { current_password: '', password: '', password_confirmation: '' } });
  return (
    <Card>
      <CardHeader title={t('Password')} eyebrow={<span className="inline-flex items-center gap-1.5"><KeyRound className="size-3.5" /> {t('Security')}</span>} />
      <CardBody>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            change.mutate(v, {
              onSuccess: () => {
                notify.success(t('Password changed'));
                reset();
              },
              onError: (e) => {
                if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as 'password', { message: m[0] });
              },
            }),
          )}
        >
          <FormError message={change.error && !(isApiError(change.error) && change.error.isValidation) ? change.error.message : null} />
          <Field label={t('Current password')} error={formState.errors.current_password?.message && t(formState.errors.current_password.message)}>
            <Input type="password" autoComplete="current-password" {...register('current_password')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('New password')} error={formState.errors.password?.message && t(formState.errors.password.message)}>
              <Input type="password" autoComplete="new-password" {...register('password')} />
            </Field>
            <Field label={t('Confirm new password')} error={formState.errors.password_confirmation?.message && t(formState.errors.password_confirmation.message)}>
              <Input type="password" autoComplete="new-password" {...register('password_confirmation')} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={change.isPending}>
              {t('Change password')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/** Alerts outside the app: Telegram (free) and SMS (basic phones, time-critical only). */
function AlertsCard() {
  const t = useT();
  const { user } = useSession();
  const link = useTelegramLink();
  const unlink = useTelegramUnlink();
  const update = useUpdateAccount();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [waiting, setWaiting] = useState(false);
  const me = useMe();
  // Back from Telegram → refresh so "Connected" shows without a reload.
  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => me.refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [waiting, me]);
  if (!user) return null;
  const smsOn = Boolean(user.sms_opt_in);

  return (
    <Card>
      <CardHeader
        title={t('Alerts on your phone')}
        eyebrow={<span className="inline-flex items-center gap-1.5"><BellRing className="size-3.5" /> {t('Alerts')}</span>}
        description={t('Get shift updates even when the app is closed.')}
      />
      <CardBody className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-info-soft text-info"><Send className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text">Telegram</div>
            <p className="text-[13px] text-muted">
              {user.telegram_linked
                ? t('Connected. Shift alerts come to your Telegram.')
                : waiting
                  ? t('Tap Start in Telegram, then come back here.')
                  : t('Free. Connect once and alerts arrive in Telegram.')}
            </p>
          </div>
          {user.telegram_linked ? (
            <Button size="sm" variant="ghost" loading={unlink.isPending} onClick={() => unlink.mutate(undefined, { onSuccess: () => notify.success(t('Telegram disconnected')) })}>
              {t('Disconnect')}
            </Button>
          ) : (
            <Button
              size="sm"
              loading={link.isPending}
              onClick={() =>
                link.mutate(undefined, {
                  onSuccess: (r) => {
                    window.open(r.url, '_blank', 'noopener');
                    setWaiting(true);
                  },
                  onError: (e) => notify.error(e),
                })
              }
            >
              {t('Connect Telegram')}
            </Button>
          )}
        </div>

        <div className="flex items-start gap-3 border-t border-line pt-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success"><MessageSquareText className="size-4" /></span>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-text">SMS</div>
                <p className="text-[13px] text-muted">{t('Only the important ones: approved, time changed, cancelled, a place opened up.')}</p>
              </div>
              <Switch
                checked={smsOn}
                aria-label={t('SMS alerts')}
                disabled={update.isPending}
                onCheckedChange={(v) =>
                  update.mutate(
                    { sms_opt_in: v, ...(v && !user.phone && phone ? { phone } : {}) },
                    { onSuccess: () => notify.success(v ? t('SMS alerts on') : t('SMS alerts off')), onError: (e) => notify.error(e) },
                  )
                }
              />
            </div>
            {!user.phone && (
              <Field label={t('Phone number')} hint={t('Needed for SMS, e.g. +251911223344')}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+2519…" />
              </Field>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function AccountPage() {
  const { user, role } = useSession();
  const upload = useUploadPhoto();
  const logout = useLogout();
  const notifications = useNotifications();
  const readAll = useMarkAllNotificationsRead();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useSetTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    document.title = 'Account · VolunTrack';
    if (location.pathname.endsWith('/notifications')) notifRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [location.pathname]);

  if (!user || !role) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader eyebrow={t('Account')} title={t('Account & security')} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar name={user.full_name} src={user.profile_photo_url} size="xl" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-surface transition-transform hover:scale-105"
                  aria-label={t('Change photo')}
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 2 * 1024 * 1024) return notify.warning(t('That photo is too large'), t('Use an image under 2 MB.'));
                    upload.mutate(f, { onSuccess: () => notify.success(t('Photo updated')), onError: (err) => notify.error(err) });
                  }}
                />
              </div>
              <div className="min-w-0">
                <h2 className="type-title truncate text-xl text-text">{user.full_name}</h2>
                <p className="truncate text-sm text-muted">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge size="sm" tone="accent">
                    {t(ROLE_LABEL[role])}
                  </Badge>
                  {user.organization && <Badge size="sm">{user.organization.name}</Badge>}
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="type-eyebrow-sm">{t('Member since')}</dt>
                <dd className="mt-1 text-text">{formatDate(user.created_at, 'MMMM yyyy')}</dd>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <dt className="type-eyebrow-sm">{t('Last sign-in')}</dt>
                <dd className="mt-1 text-text">{user.last_login ? formatRelative(user.last_login) : '—'}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title={t('Appearance')} eyebrow={<span className="inline-flex items-center gap-1.5"><Palette className="size-3.5" /> {t('Display')}</span>} />
            <CardBody className="grid grid-cols-3 gap-2">
              {(
                [
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                  ['system', 'System', Monitor],
                ] as [ThemePref, string, typeof Sun][]
              ).map(([v, l, Icon]) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  aria-pressed={theme === v}
                  className={cn('flex flex-col items-center gap-2 rounded-lg p-4 text-[13px] font-medium transition-colors', theme === v ? 'bg-accent-soft text-accent-text [box-shadow:inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface-2 text-muted hover:text-text')}
                >
                  <Icon className="size-5" />
                  {t(l)}
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('Language')} eyebrow={<span className="inline-flex items-center gap-1.5"><Languages className="size-3.5" /> {t('Display')}</span>} />
            <CardBody>
              <LanguageToggle className="w-fit" />
            </CardBody>
          </Card>

          <Button variant="danger-soft" className="w-full" onClick={() => logout.mutate()} loading={logout.isPending}>
            <LogOut /> {t('Sign out of this device')}
          </Button>
        </div>

        <div className="space-y-6">
          <PasswordCard />
          <AlertsCard />
          <div ref={notifRef}>
            <Card>
              <CardHeader
                title={t('Notifications')}
                description={notifications.data ? t('{n} unread', { n: notifications.data.unread }) : undefined}
                action={
                  notifications.data?.unread ? (
                    <Button size="xs" variant="ghost" onClick={() => readAll.mutate()} loading={readAll.isPending}>
                      {t('Mark all read')}
                    </Button>
                  ) : undefined
                }
              />
              <ul className="mt-2 divide-y divide-line px-5 pb-3">
                {notifications.isLoading && <Skeleton className="my-3 h-14" />}
                {notifications.data?.items.slice(0, 12).map((n) => (
                  <li key={n.id} className="flex gap-3 py-3">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-line-strong' : 'bg-accent')} />
                    <div className="min-w-0">
                      <div className={cn('text-sm', n.read_at ? 'text-muted' : 'font-medium text-text')}>{n.title}</div>
                      <div className="text-[13px] text-faint">{n.body}</div>
                      <div className="mt-0.5 text-[11.5px] text-faint">{formatRelative(n.created_at)}</div>
                    </div>
                  </li>
                ))}
                {notifications.data?.items.length === 0 && <li className="py-6 text-center text-sm text-muted">{t('No notifications yet.')}</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
