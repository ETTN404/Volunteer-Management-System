import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, MoreHorizontal, Pencil, Power, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { User } from '@/shared/types/api';
import { formatRelative } from '@/shared/lib/time';
import { isApiError } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Field, FormError, Input, Menu, MenuContent, MenuItem, MenuTrigger, PageHeader, Skeleton, notify } from '@/shared/ui';
import { useAllMembers, useCreateCoordinator, useToggleCoordinator, useUpdateCoordinator } from '@/features/organization/api';

// Mirrors CreateCoordinatorRequest
const schema = z.object({
  full_name: z.string().trim().min(1, 'Enter their name.').max(100),
  email: z.string().trim().email('Enter a valid email.').max(100),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join('');
}

function AddCoordinatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCoordinator();
  const [show, setShow] = useState(true);
  const { register, handleSubmit, reset, setValue, formState, setError, getValues } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { full_name: '', email: '', password: '' } });
  useEffect(() => {
    if (open) reset({ full_name: '', email: '', password: generatePassword() });
  }, [open, reset]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add a coordinator" description="They can manage events, applications, attendance and reports for your organization.">
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            create.mutate(v, {
              onSuccess: () => {
                notify.success('Coordinator added', `Share the sign-in details with ${v.full_name}.`);
                navigator.clipboard?.writeText(`VolunTrack sign-in\nEmail: ${v.email}\nTemporary password: ${v.password}`).catch(() => undefined);
                onOpenChange(false);
              },
              onError: (e) => {
                if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as 'email', { message: m[0] });
              },
            }),
          )}
        >
          <FormError message={create.error && !(isApiError(create.error) && create.error.isValidation) ? create.error.message : null} />
          <Field label="Full name" error={formState.errors.full_name?.message}>
            <Input {...register('full_name')} autoFocus />
          </Field>
          <Field label="Email" error={formState.errors.email?.message}>
            <Input type="email" {...register('email')} />
          </Field>
          <Field
            label="Temporary password"
            hint="Copied to your clipboard when you add them. Ask them to change it after signing in."
            error={formState.errors.password?.message}
            aside={
              <button type="button" className="text-[12.5px] font-medium text-accent-text hover:underline" onClick={() => setValue('password', generatePassword())}>
                Generate new
              </button>
            }
          >
            <Input
              type={show ? 'text' : 'password'}
              className="type-data"
              {...register('password')}
              trailing={
                <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center text-faint hover:text-text" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff /> : <Eye />}
                </button>
              }
            />
          </Field>
          <DialogActions>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} onClick={() => getValues()}>
              <UserPlus /> Add coordinator
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const update = useUpdateCoordinator();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (user) {
      setName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);
  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Edit coordinator" size="sm">
        <div className="space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <FormError message={update.error?.message} />
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={() => user && update.mutate({ id: user.id, full_name: name, email }, { onSuccess: () => (notify.success('Coordinator updated'), onClose()) })}>
            Save
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const members = useAllMembers();
  const toggle = useToggleCoordinator();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  useEffect(() => {
    document.title = 'Coordinators · VolunTrack';
  }, []);
  const coords = (members.data ?? []).filter((m) => m.role === 'Coordinator');

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Coordinators"
        description="Staff who run events and approve volunteers."
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Add a coordinator
          </Button>
        }
      />
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
                    <MenuItem danger={c.is_active} onSelect={() => toggle.mutate(c.id, { onSuccess: (r) => notify.success(r.message), onError: (e) => notify.error(e) })}>
                      <Power /> {c.is_active ? 'Deactivate' : 'Reactivate'}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <div className="mt-5 flex items-center justify-between text-[12.5px]">
                <Badge tone={c.is_active ? 'success' : 'neutral'} size="sm" dot>
                  {c.is_active ? 'Active' : 'Deactivated'}
                </Badge>
                <span className="text-faint">{c.last_login ? `Last seen ${formatRelative(c.last_login)}` : 'Hasn’t signed in yet'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddCoordinatorDialog open={adding} onOpenChange={setAdding} />
      <EditDialog user={editing} onClose={() => setEditing(null)} />
    </>
  );
}
