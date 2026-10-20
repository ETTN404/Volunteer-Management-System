import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, MailCheck, MailWarning, MoreHorizontal, Pencil, Power, Send, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Invitation, User } from '@/shared/types/api';
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
  InlineAlert,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PageHeader,
  PhoneInput,
  Skeleton,
  formatPhone,
  isValidPhone,
  notify,
} from '@/shared/ui';
import { useAllMembers, useBilling, useCreateCoordinator, useResendCoordinatorInvite, useToggleCoordinator, useUpdateCoordinator } from '@/features/organization/api';
import { PlanLimitNotice } from '@/features/organization/plan-notice';

// Mirrors CreateCoordinatorRequest — no password: the coordinator is invited by email.
const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter their first name.').max(60),
  last_name: z.string().trim().min(1, 'Enter their last name.').max(60),
  email: z.string().trim().email('Enter a valid email.').max(100),
  phone: z.string().refine((v) => !v || isValidPhone(v), 'Enter a valid phone number.'),
});
type Values = z.infer<typeof schema>;

function InvitationResult({ invitation, email }: { invitation: Invitation; email: string }) {
  return (
    <div className="space-y-3">
      {invitation.email_sent ? (
        <InlineAlert tone="success" icon={<MailCheck />} title={`Invitation sent to ${email}`}>
          It contains a temporary password and a one-time link that expires {new Date(invitation.expires_at).toLocaleString()}. Opening the link confirms they own the email address; they then choose their own password.
        </InlineAlert>
      ) : (
        <InlineAlert tone="warning" icon={<MailWarning />} title="The email could not be sent">
          Share the one-time link below with them directly (e.g. on Telegram). It works once.
        </InlineAlert>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(invitation.invite_url);
          notify.success('Invitation link copied');
        }}
      >
        <Copy /> Copy invitation link
      </Button>
    </div>
  );
}

function AddCoordinatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCoordinator();
  const [result, setResult] = useState<{ invitation: Invitation; email: string } | null>(null);
  const { register, control, handleSubmit, reset, formState, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', phone: '' },
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
      <DialogContent title={result ? 'Coordinator invited' : 'Invite a coordinator'} description={result ? undefined : 'They can manage events, applications, attendance and reports for your organization.'}>
        {result ? (
          <>
            <InvitationResult invitation={result.invitation} email={result.email} />
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
                { ...v, phone: v.phone || null },
                {
                  onSuccess: (r) => setResult({ invitation: r.invitation, email: v.email }),
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
            <Field label="Work email" error={formState.errors.email?.message} hint="The invitation goes here. Opening it verifies the address.">
              <Input type="email" {...register('email')} autoComplete="off" />
            </Field>
            <Field label="Mobile" optional error={formState.errors.phone?.message} hint="Lets volunteers and you reach them on the day.">
              <Controller control={control} name="phone" render={({ field }) => <PhoneInput country="ET" value={field.value} onChange={field.onChange} />} />
            </Field>
            <DialogActions>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                <Send /> Send invitation
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
  const resend = useResendCoordinatorInvite();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resent, setResent] = useState<{ invitation: Invitation; email: string } | null>(null);
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
        description="Staff who run events and approve volunteers. Each one is invited by email — nobody shares passwords."
        actions={
          <Button onClick={() => setAdding(true)} disabled={atLimit}>
            <UserPlus /> Invite a coordinator
          </Button>
        }
      />
      {limit && <PlanLimitNotice className="mb-5" label="coordinators" used={limit.used} limit={limit.limit} />}
      {members.isLoading ? (
        <Skeleton className="h-60 rounded-xl" />
      ) : members.error ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : coords.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="No coordinators yet" description="Invite someone to manage events and approve volunteers." action={<Button onClick={() => setAdding(true)}>Invite a coordinator</Button>} />
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
                    {c.invitation_pending && (
                      <MenuItem
                        onSelect={() =>
                          resend.mutate(c.id, {
                            onSuccess: (r) => setResent({ invitation: r.invitation, email: c.email }),
                            onError: (e) => notify.error(errorMessage(e)),
                          })
                        }
                      >
                        <Send /> Resend invitation
                      </MenuItem>
                    )}
                    <MenuItem danger={c.is_active} onSelect={() => toggle.mutate(c.id, { onSuccess: (r) => notify.success(r.message), onError: (e) => notify.error(e) })}>
                      <Power /> {c.is_active ? 'Deactivate' : 'Reactivate'}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <div className="mt-5 flex items-center justify-between text-[12.5px]">
                {c.invitation_pending ? (
                  <Badge tone="warning" size="sm" dot>
                    Invitation pending
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
      <Dialog open={Boolean(resent)} onOpenChange={(o) => !o && setResent(null)}>
        <DialogContent title="New invitation sent" size="sm">
          {resent && <InvitationResult invitation={resent.invitation} email={resent.email} />}
          <DialogActions>
            <Button onClick={() => setResent(null)}>Done</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
