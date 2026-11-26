import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { Input, type InputProps } from './input';

/** Easy-to-read random password: no 0/O/1/l/I, always mixes letters and digits. */
export function generatePassword(length = 10): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0]! % set.length]!;
  };
  let pw = '';
  do {
    pw = Array.from({ length }, () => pick(all)).join('');
  } while (!/\d/.test(pw) || !/[A-Za-z]/.test(pw));
  return pw;
}

/**
 * Password field with show/hide. Pass `onGenerate` to offer a "generate" button
 * (staff forms where an admin creates the password and shares it).
 */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps & { onGenerate?: (pw: string) => void }>(({ onGenerate, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      autoComplete="new-password"
      spellCheck={false}
      trailing={
        <span className="flex items-center gap-0.5">
          {onGenerate && (
            <button
              type="button"
              onClick={() => {
                onGenerate(generatePassword());
                setShow(true);
              }}
              className="grid size-8 place-items-center rounded-md text-faint hover:text-text"
              aria-label="Generate a password"
              title="Generate a password"
            >
              <Wand2 />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="grid size-8 place-items-center rounded-md text-faint hover:text-text"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </span>
      }
      {...props}
      className={onGenerate ? 'pr-20' : props.className}
    />
  );
});
PasswordInput.displayName = 'PasswordInput';
