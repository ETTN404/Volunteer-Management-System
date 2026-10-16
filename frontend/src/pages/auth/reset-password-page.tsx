import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button, Field, FormError, Input } from '@/shared/ui';
import { errorMessage } from '@/shared/api/http';
import { useResetPassword } from '@/features/auth/api';
import { AuthLayout, AuthQuote } from './auth-layout';

const schema = z
  .object({
    email: z.string().trim().email('Enter your email.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'The passwords don’t match.' });

export default function ResetPasswordPage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const mut = useResetPassword();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: params.get('email') ?? '', password: '', password_confirmation: '' },
  });

  return (
    <AuthLayout aside={<AuthQuote />}>
      {mut.isSuccess ? (
        <>
          <div className="mb-6 grid size-14 place-items-center rounded-full bg-success-soft text-success-text">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="type-headline text-[30px] text-text">Password updated</h1>
          <p className="mt-3 text-[15px] text-muted">Sign in with your new password.</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/login">Sign in</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="type-eyebrow mb-4">Reset password</p>
          <h1 className="type-headline text-[30px] text-text">Choose a new password</h1>
          <form onSubmit={handleSubmit((v) => mut.mutate({ ...v, token }))} noValidate className="mt-8 space-y-5">
            <FormError message={mut.error ? errorMessage(mut.error) : null} />
            <Field label="Email" error={formState.errors.email?.message}>
              <Input inputSize="lg" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Field label="New password" hint="At least 8 characters." error={formState.errors.password?.message}>
              <Input inputSize="lg" type="password" autoComplete="new-password" autoFocus {...register('password')} />
            </Field>
            <Field label="Confirm new password" error={formState.errors.password_confirmation?.message}>
              <Input inputSize="lg" type="password" autoComplete="new-password" {...register('password_confirmation')} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={mut.isPending}>
              Update password
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
