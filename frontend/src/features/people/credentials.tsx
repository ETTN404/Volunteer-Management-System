import { Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User } from '@/shared/types/api';
import { errorMessage } from '@/shared/api/http';
import { Button, Dialog, DialogActions, DialogContent, Field, FormError, InlineAlert, PasswordInput, notify } from '@/shared/ui';

export interface Credentials {
  name: string;
  email: string;
  password: string;
}

/** Sign-in details for a staff member, to hand over privately (Telegram, SMS, in person). */
export function CredentialsCard({ creds }: { creds: Credentials }) {
  const loginUrl = `${window.location.origin}/login`;
  const text = `VolunTrack sign-in\n${loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.password}`;
  return (
    <div className="space-y-3">
      <InlineAlert tone="success" icon={<ShieldCheck />} title={`${creds.name} can sign in now`}>
        Share these details with them privately. They can change the password any time from Account settings.
      </InlineAlert>
      <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 rounded-lg bg-surface-2 px-4 py-3 text-sm [box-shadow:inset_0_0_0_1px_var(--line)]">
        <dt className="text-faint">Sign in at</dt>
        <dd className="truncate font-medium text-text">{loginUrl}</dd>
        <dt className="text-faint">Email</dt>
        <dd className="truncate font-medium text-text">{creds.email}</dd>
        <dt className="text-faint">Password</dt>
        <dd className="font-mono font-semibold tracking-wide break-all text-text">{creds.password}</dd>
      </dl>
      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          notify.success('Sign-in details copied');
        }}
      >
        <Copy /> Copy sign-in details
      </Button>
    </div>
  );
}

/** Admin sets a new password for a staff member (forgotten password, first sign-in). */
export function SetPasswordDialog({ user, onClose, save }: { user: User | null; onClose: () => void; save: (id: number, password: string) => Promise<unknown> }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<Credentials | null>(null);
  useEffect(() => {
    if (user) {
      setPassword('');
      setDone(null);
      setError(null);
    }
  }, [user]);
  const tooShort = password.length > 0 && password.length < 8;

  const submit = async () => {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      await save(user.id, password);
      setDone({ name: user.full_name, email: user.email, password });
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={done ? 'Password changed' : 'Set a new password'}
        description={done ? undefined : user ? `For ${user.full_name}. Their other sessions are signed out.` : undefined}
        size="sm"
      >
        {done ? (
          <CredentialsCard creds={done} />
        ) : (
          <div className="space-y-4">
            <Field label="New password" error={tooShort ? 'At least 8 characters.' : undefined} hint="Tap the wand to generate one.">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} onGenerate={setPassword} autoFocus />
            </Field>
            <FormError message={error ? errorMessage(error) : null} />
          </div>
        )}
        <DialogActions>
          {done ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button loading={pending} disabled={password.length < 8} onClick={() => void submit()}>
                <KeyRound /> Save password
              </Button>
            </>
          )}
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
