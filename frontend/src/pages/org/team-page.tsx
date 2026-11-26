import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, MoreHorizontal, Pencil, Power, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { User } from '@/shared/types/api';
import { formatRelative } from '@/shared/lib/time';
import { errorMessage, isApiError } from '@/shared/api/http';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PageHeader,
  PasswordInput,
  PhoneInput,
  Skeleton,
  formatPhone,
  isValidPhone,
  notify,
} from '@/shared/ui';
import { useAllMembers, useBilling, useCreateCoordinator, useSetCoordinatorPassword, useToggleCoordinator, useUpdateCoordinator } from '@/features/organization/api';
import { PlanLimitNotice } from '@/features/organization/plan-notice';
import { CredentialsCard, SetPasswordDialog, type Credentials } from '@/features/people/credentials';

// Mirrors CreateCoordinatorRequest: the admin sets the password and shares it — no email needed.
const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter their first name.').max(60),
  last_name: z.string().trim().min(1, 'Enter their last name.').max(60),
  email: z.string().trim().email('Enter a valid email.').max(100),
  phone: z.string().refine((v) => !v || isValidPhone(v), 'Enter a valid phone number.'),
  password: z.string().min(8, 'At least 8 characters.').max(100),
});
type Values = z.infer<typeof schema>;

function AddCoordinatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCoordinator();
  const [result, setResult] = useState<Credentials | null>(null);
  const { register, control, handleSubmit, reset, formState, setError, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', phone: '', password: '' },
  });
  useEffect(() => {
    if (open) {
      reset();
      setResult(null);
      create.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={result ? 'Coordinator added' : 'Add a coordinator'} description={result ? undefined : 'They can manage events, applications, attendance and reports for your organization.'}>
        {result ? (
          <>
            <CredentialsCard creds={result} />
            <DialogActions>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogActions>
          </>
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((v) =>
              create.mutate(
                { ...v, phone: v.phone || null, password_confirmation: v.password },
                {
                  onSuccess: () => setResult({ name: `${v.first_name} ${v.last_name}`.trim(), email: v.email.trim().toLowerCase(), password: v.password }),
                  onError: (e) => {
                    if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof Values, { message: m[0] });
                  },
                },
              ),
            )}
          >
            <FormError message={create.error && !(isApiError(create.error) && create.error.isValidation) ? errorMessage(create.error) : null} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" error={formState.errors.first_name?.message}>
                <Input {...register('first_name')} autoFocus autoComplete="off" />
              </Field>
              <Field label="Last name" error={formState.errors.last_name?.message}>
                <Input {...register('last_name')} autoComplete="off" />
              </Field>
            </div>
            <Field label="Email" error={formState.errors.email?.message} hint="They sign in with this email.">
              <Input type="email" {...register('email')} autoComplete="off" />
            </Field>
            <Field label="Password" error={formState.errors.password?.message} hint="At least 8 characters. Tap the wand to generate one.">
              <PasswordInput {...register('password')} onGenerate={(pw) => setValue('password', pw, { shouldValidate: true })} />
            </Field>
            <Field label="Mobile" optional error={formState.errors.phone?.message} hint="Lets volunteers and you reach them on the day.">
              <Controller control={control} name="phone" render={({ field }) => <PhoneInput country="ET" value={field.value} onChange={field.onChange} />} />
            </Field>
            <DialogActions>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                <UserPlus /> Add coordinator
              </Button>
            </DialogActions>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const update = useUpdateCoordinator();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (user) {
      setFirst(user.first_name ?? user.full_name.split(' ')[0] ?? '');
      setLast(user.last_name ?? user.full_name.split(' ').slice(1).join(' '));
      setEmail(user.email);
      setPhone(user.phone ?? '');
      update.reset();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Edit coordinator" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mobile" optional>
            <PhoneInput country="ET" value={phone} onChange={setPhone} />
          </Field>
          <FormError message={update.error ? errorMessage(update.error) : null} />
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={update.isPending}
            disabled={!first.trim() || !last.trim() || (phone !== '' && !isValidPhone(phone))}
            onClick={() =>
              user && update.mutate({ id: user.id, first_name: first.trim(), last_name: last.trim(), email: email.trim(), phone: phone || null }, { onSuccess: () => (notify.success('Coordinator updated'), onClose()) })
            }
          >
            Save
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const members = useAllMembers();
  const billing = useBilling();
  const toggle = useToggleCoordinator();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pwFor, setPwFor] = useState<User | null>(null);
  const setPassword = useSetCoordinatorPassword();
  useEffect(() => {
    document.title = 'Coordinators · VolunTrack';
  }, []);
  const coords = (members.data ?? []).filter((m) => m.role === 'Coordinator');
  const limit = billing.data?.limits.coordinators;
  const atLimit = limit?.limit != null && limit.used >= limit.limit;

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Coordinators"
        description="Staff who run events and approve volunteers. You set their password when you add them — they can sign in right away."
        actions={
          <Button onClick={() => setAdding(true)} disabled={atLimit}>
            <UserPlus /> Add a coordinator
          </Button>
        }
      />
      {limit && <PlanLimitNotice className="mb-5" label="coordinators" used={limit.used} limit={limit.limit} />}
      {members.isLoading ? (
        <Skeleton className="h-60 rounded-xl" />
      ) : members.error ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : coords.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="No coordinators yet" description="Add someone to manage events and approve volunteers." action={<Button onClick={() => setAdding(true)}>Add a coordinator</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coords.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar name={c.full_name} src={c.profile_photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-text">{c.full_name}</div>
                  <div className="truncate text-[12.5px] text-faint">{c.email}</div>
                  {c.phone && <div className="truncate text-[12.5px] text-faint">{formatPhone(c.phone)}</div>}
                </div>
                <Menu>
                  <MenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${c.full_name}`}>
                      <MoreHorizontal />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem onSelect={() => setEditing(c)}>
                      <Pencil /> Edit details
                    </MenuItem>
                    <MenuItem onSelect={() => setPwFor(c)}>
                      <KeyRound /> Set new password
                    </MenuItem>
                    <MenuItem danger={c.is_active} onSelect={() => toggle.mutate(c.id, { onSuccess: (r) => notify.success(r.message), onError: (e) => notify.error(e) })}>
                      <Power /> {c.is_active ? 'Deactivate' : 'Reactivate'}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <div className="mt-5 flex items-center justify-between text-[12.5px]">
                {c.invitation_pending && c.is_active ? (
                  <Badge tone="warning" size="sm" dot>
                    Needs a password
                  </Badge>
                ) : (
                  <Badge tone={c.is_active ? 'success' : 'neutral'} size="sm" dot>
                    {c.is_active ? 'Active' : 'Deactivated'}
                  </Badge>
                )}
                <span className="text-faint">{c.last_login ? `Last seen ${formatRelative(c.last_login)}` : 'Hasn’t signed in yet'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddCoordinatorDialog open={adding} onOpenChange={setAdding} />
      <EditDialog user={editing} onClose={() => setEditing(null)} />
      <SetPasswordDialog user={pwFor} onClose={() => setPwFor(null)} save={(id, password) => setPassword.mutateAsync({ id, password })} />
    </>
  );
}
