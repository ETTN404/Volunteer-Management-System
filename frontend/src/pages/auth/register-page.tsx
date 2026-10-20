import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { cn } from '@/shared/lib/cn';
import { AVAILABILITY_SLOTS, SKILL_CATALOGUE, normalizeSkill } from '@/shared/lib/skills';
import { Button, DatePicker, Field, FormError, InlineAlert, Input, PhoneInput, Skeleton, TagInput, Textarea, isValidPhone } from '@/shared/ui';
import { errorMessage, isApiError } from '@/shared/api/http';
import { useRegister } from '@/features/auth/api';
import { usePublicOrganizations } from '@/features/public/api';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { AuthLayout } from './auth-layout';

// Mirrors App\Http\Requests\RegisterVolunteerRequest.
const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(60),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(60),
  phone: z.string().refine((v) => !v || isValidPhone(v), 'Enter a valid phone number.'),
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.').max(100),
  password: z.string().min(8, 'Use at least 8 characters.'),
  org_id: z.number().nullable().optional(),
  skills: z.array(z.string().max(100)).max(15, 'Pick up to 15 skills.'),
  availability: z.array(z.string()),
  bio: z.string().max(1000, 'Keep your bio under 1,000 characters.').optional(),
  date_of_birth: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v) < new Date(), 'Date of birth must be in the past.'),
});
type Values = z.infer<typeof schema>;

const STEPS = [
  { title: 'Your account', fields: ['first_name', 'last_name', 'email', 'phone', 'password'] as const },
  { title: 'Your organization', fields: ['org_id'] as const },
  { title: 'Skills & time', fields: ['skills', 'availability', 'date_of_birth', 'bio'] as const },
];

function ageFrom(dob?: string) {
  if (!dob) return null;
  return (Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000);
}

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const registerMut = useRegister();
  const orgs = usePublicOrganizations();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', phone: '', email: '', password: '', skills: [], availability: [], bio: '', date_of_birth: '' },
    mode: 'onTouched',
  });
  const { register, control, handleSubmit, trigger, formState, watch, setError } = form;
  const age = ageFrom(watch('date_of_birth'));

  useEffect(() => {
    document.title = 'Join as a volunteer · VolunTrack';
  }, []);

  const next = async () => {
    const ok = await trigger(STEPS[step]!.fields as unknown as (keyof Values)[]);
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const res = await registerMut.mutateAsync({ ...v, phone: v.phone || null, bio: v.bio || null, date_of_birth: v.date_of_birth || null });
      navigate('/v', { replace: true, state: { welcome: res.user.full_name } });
    } catch (e) {
      if (isApiError(e) && e.isValidation) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          if (field in v) setError(field as keyof Values, { message: msgs[0] });
        }
        if (e.fieldErrors.email || e.fieldErrors.first_name || e.fieldErrors.last_name || e.fieldErrors.phone || e.fieldErrors.password) setStep(0);
      }
    }
  });

  return (
    <AuthLayout
      aside={
        <div className="max-w-md space-y-4">
          {['Shifts ranked by how well they fit your skills', 'Check in from the venue — no paper sign-in sheets', 'A certificate at every milestone: 10, 25, 50, 100+ hours'].map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5 text-[15px] text-white backdrop-blur [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              <Check className="size-4 text-[#a9b2ff]" /> {t}
            </div>
          ))}
        </div>
      }
    >
      <p className="type-eyebrow mb-4">Join as a volunteer</p>
      <h1 className="type-headline text-[32px] text-text">Create your volunteer account</h1>

      {/* Step indicator */}
      <ol className="mt-7 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-1 flex-col gap-2">
            <span className={cn('h-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent' : 'bg-line')} />
            <span className={cn('text-[12px] font-medium', i === step ? 'text-text' : 'text-faint')} aria-current={i === step ? 'step' : undefined}>
              {i + 1}. {s.title}
            </span>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) void next();
          else void onSubmit(e);
        }}
        noValidate
        className="mt-8"
      >
        <FormError message={registerMut.error && !(isApiError(registerMut.error) && registerMut.error.isValidation) ? errorMessage(registerMut.error) : null} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }} className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" error={formState.errors.first_name?.message}>
                    <Input inputSize="lg" autoComplete="given-name" autoFocus placeholder="Hana" {...register('first_name')} />
                  </Field>
                  <Field label="Last name" error={formState.errors.last_name?.message}>
                    <Input inputSize="lg" autoComplete="family-name" placeholder="Tesfaye" {...register('last_name')} />
                  </Field>
                </div>
                <Field label="Email" error={formState.errors.email?.message}>
                  <Input inputSize="lg" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
                </Field>
                <Field label="Phone" optional hint="So coordinators can reach you about a shift." error={formState.errors.phone?.message}>
                  <Controller control={control} name="phone" render={({ field }) => <PhoneInput country="ET" value={field.value} onChange={field.onChange} />} />
                </Field>
                <Field label="Password" hint="At least 8 characters." error={formState.errors.password?.message}>
                  <Input
                    inputSize="lg"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    trailing={
                      <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-md text-faint hover:text-text" aria-label={show ? 'Hide password' : 'Show password'}>
                        {show ? <EyeOff /> : <Eye />}
                      </button>
                    }
                    {...register('password')}
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <Controller
                control={control}
                name="org_id"
                render={({ field, fieldState }) => (
                  <fieldset>
                    <legend className="mb-3 text-[13px] font-medium text-text">Which organization do you volunteer with?</legend>
                    <div className="space-y-2" role="radiogroup">
                      {orgs.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[68px] rounded-xl" />)}
                      {orgs.data?.map((o) => {
                        const selected = field.value === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(o.id)}
                            className={cn(
                              'flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all',
                              selected ? 'bg-accent-soft [box-shadow:inset_0_0_0_1.5px_var(--accent)]' : 'bg-sunken [box-shadow:inset_0_0_0_1px_var(--line)] hover:bg-surface-2',
                            )}
                          >
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                              <Building2 className="size-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14.5px] font-medium text-text">{o.name}</span>
                              <span className="block truncate text-[12.5px] text-faint">
                                {o.address} · {o.volunteer_count} volunteers
                              </span>
                            </span>
                            <span className={cn('grid size-5 place-items-center rounded-full transition-colors', selected ? 'bg-accent text-accent-fg' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]')}>
                              {selected && <Check className="size-3" strokeWidth={3.5} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {orgs.data?.length === 0 && (
                      <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
                        You can continue without choosing — your organization’s coordinator will add you to their programme.
                      </p>
                    )}
                    {fieldState.error && <p className="mt-2 text-[12.5px] text-danger-text">{fieldState.error.message}</p>}
                    <p className="mt-4 text-[12.5px] text-faint">Organizations onboard volunteers only after they join VolunTrack. Don’t see yours? Ask them to contact us.</p>
                  </fieldset>
                )}
              />
            )}

            {step === 2 && (
              <>
                <Controller
                  control={control}
                  name="skills"
                  render={({ field, fieldState }) => (
                    <Field label="Skills" hint="These decide which shifts you see first. Add your own if it’s missing." error={fieldState.error?.message}>
                      <TagInput value={field.value} onChange={field.onChange} suggestions={SKILL_CATALOGUE} normalize={normalizeSkill} max={15} placeholder="First aid, logistics, teaching…" />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="availability"
                  render={({ field }) => (
                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-text">When can you usually help?</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABILITY_SLOTS.map((slot) => {
                          const on = field.value.includes(slot.key);
                          return (
                            <button
                              key={slot.key}
                              type="button"
                              aria-pressed={on}
                              onClick={() => field.onChange(on ? field.value.filter((x) => x !== slot.key) : [...field.value, slot.key])}
                              className={cn('flex h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-accent-soft text-accent-text [box-shadow:inset_0_0_0_1px_var(--accent)]' : 'bg-sunken text-muted [box-shadow:inset_0_0_0_1px_var(--line)] hover:text-text')}
                            >
                              <span className={cn('grid size-4 place-items-center rounded-[4px]', on ? 'bg-accent text-accent-fg' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]')}>{on && <Check className="size-2.5" strokeWidth={4} />}</span>
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
                />
                <Field label="Date of birth" optional hint="Volunteers under 18 need a parental consent form before joining shifts." error={formState.errors.date_of_birth?.message}>
                  <Controller control={control} name="date_of_birth" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} max={new Date().toISOString().slice(0, 10)} placeholder="Select your birthday" />} />
                </Field>
                {age != null && age < 18 && (
                  <InlineAlert tone="warning" title="Parental consent needed">
                    After signing up, upload a signed consent form under Documents. You can browse shifts now and apply once a coordinator verifies it.
                  </InlineAlert>
                )}
                <Field label="About you" optional error={formState.errors.bio?.message}>
                  <Textarea rows={3} placeholder="What you do, languages you speak, why you volunteer…" {...register('bio')} />
                </Field>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={registerMut.isPending}>
            {step < STEPS.length - 1 ? (
              <>
                Continue <ArrowRight />
              </>
            ) : (
              'Create my account'
            )}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-text hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
