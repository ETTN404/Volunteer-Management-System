import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { Button, Field, FormError, Input } from '@/shared/ui';
import { errorMessage } from '@/shared/api/http';
import { useForgotPassword } from '@/features/auth/api';
import { AuthLayout, AuthQuote } from './auth-layout';

const schema = z.object({ email: z.string().trim().email('Enter the email you signed up with.') });

export default function ForgotPasswordPage() {
  const mut = useForgotPassword();
  const { register, handleSubmit, formState, getValues } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (mut.isSuccess) {
    return (
      <AuthLayout aside={<AuthQuote />}>
        <div className="mb-6 grid size-14 place-items-center rounded-full bg-success-soft text-success-text">
          <MailCheck className="size-6" />
        </div>
        <h1 className="type-headline text-[30px] text-text">Check your inbox</h1>
        <p className="mt-3 text-[15px] text-muted">
          If <span className="text-text">{getValues('email')}</span> has an account, a reset link is on its way. It expires in 60 minutes.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-8">
          <Link to="/login">
            <ArrowLeft /> Back to sign in
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout aside={<AuthQuote />}>
      <p className="type-eyebrow mb-4">Reset password</p>
      <h1 className="type-headline text-[30px] text-text">Forgot your password?</h1>
      <p className="mt-2 text-[15px] text-muted">Enter your email and we’ll send a link to choose a new one.</p>
      <form onSubmit={handleSubmit((v) => mut.mutate(v.email))} noValidate className="mt-8 space-y-5">
        <FormError message={mut.error ? errorMessage(mut.error) : null} />
        <Field label="Email" error={formState.errors.email?.message}>
          <Input inputSize="lg" type="email" autoComplete="email" autoFocus leading={<Mail />} {...register('email')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={mut.isPending}>
          Send reset link
        </Button>
      </form>
      <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </AuthLayout>
  );
}
