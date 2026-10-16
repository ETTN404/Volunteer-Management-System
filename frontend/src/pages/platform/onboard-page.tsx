import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { cn } from '@/shared/lib/cn';
import { isApiError } from '@/shared/api/http';
import { Button, Card, Field, FormError, Input, KeyValue, PageHeader, notify } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { useOnboardTenant, type OnboardInput } from '@/features/platform/api';

// Mirrors OnboardTenantRequest
const schema = z.object({
  org_name: z.string().trim().min(1, 'Enter the organization’s name.').max(150),
  org_email: z.string().trim().email('Enter a valid email.').max(100),
  org_address: z.string().trim().min(1, 'Enter an address.').max(255),
  org_phone: z.string().trim().max(50).optional(),
  org_website: z.union([z.literal(''), z.string().trim().url('Use a full URL, e.g. https://example.org')]).optional(),
  admin_full_name: z.string().trim().min(1, 'Enter the admin’s name.').max(100),
  admin_email: z.string().trim().email('Enter a valid email.').max(100),
  admin_password: z.string().min(8, 'Use at least 8 characters.'),
});
type Values = z.infer<typeof schema>;

const STEPS = [
  { title: 'Organization', fields: ['org_name', 'org_email', 'org_address', 'org_phone', 'org_website'] as const },
  { title: 'First admin', fields: ['admin_full_name', 'admin_email', 'admin_password'] as const },
  { title: 'Review', fields: [] as const },
];

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const onboard = useOnboardTenant();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { org_name: '', org_email: '', org_address: '', org_phone: '', org_website: '', admin_full_name: '', admin_email: '', admin_password: '' }, mode: 'onTouched' });
  const { register, handleSubmit, trigger, formState, getValues, setError, reset } = form;

  useEffect(() => {
    document.title = 'Onboard an organization · VolunTrack';
  }, []);

  const next = async () => {
    if (await trigger(STEPS[step]!.fields as unknown as (keyof Values)[])) setStep((s) => s + 1);
  };
  const submit = handleSubmit((v) =>
    onboard.mutate({ ...v, org_phone: v.org_phone || null, org_website: v.org_website || null } as OnboardInput, {
      onError: (e) => {
        if (isApiError(e) && e.isValidation) {
          for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof Values, { message: m[0] });
          setStep(e.fieldErrors.org_email || e.fieldErrors.org_name ? 0 : 1);
        }
      },
    }),
  );

  if (onboard.isSuccess) {
    const { organization, admin } = onboard.data;
    const creds = `VolunTrack admin access for ${organization.name}\nSign in: ${window.location.origin}/login\nEmail: ${admin.email}\nTemporary password: ${getValues('admin_password')}`;
    return (
      <div className="mx-auto max-w-xl py-6 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }} className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success-text">
          <CheckCircle2 className="size-9" />
        </motion.div>
        <h1 className="type-headline mt-6 text-3xl text-text">{organization.name} is live</h1>
        <p className="mt-2 text-muted">Send these sign-in details to {admin.full_name}. They’ll set up branding and add coordinators.</p>
        <Card className="mt-8 p-5 text-left">
          <dl>
            <KeyValue label="Organization">{organization.name}</KeyValue>
            <KeyValue label="Admin">{admin.full_name}</KeyValue>
            <KeyValue label="Email" mono>
              {admin.email}
            </KeyValue>
          </dl>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => navigator.clipboard.writeText(creds).then(() => notify.success('Sign-in details copied'))}>
            <Copy /> Copy sign-in details
          </Button>
        </Card>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="ghost">
            <Link to={`/p/organizations/${organization.id}`}>Open organization</Link>
          </Button>
          <Button
            onClick={() => {
              onboard.reset();
              reset();
              setStep(0);
            }}
          >
            Onboard another
          </Button>
        </div>
      </div>
    );
  }

  const v = getValues();
  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Onboard an organization" description="Creates an isolated tenant and its first admin in one step." />
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,560px)]">
        <ol className="flex gap-2 lg:flex-col" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.title} className={cn('flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm lg:flex-none', i === step ? 'bg-surface font-medium text-text [box-shadow:inset_0_0_0_1px_var(--line)]' : 'text-faint')} aria-current={i === step ? 'step' : undefined}>
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', i < step ? 'bg-success text-[#03241a]' : i === step ? 'bg-accent text-accent-fg' : 'bg-surface-2')}>{i + 1}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </li>
          ))}
        </ol>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 2) void next();
            else void submit(e);
          }}
        >
          <Card className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }} className="space-y-5">
                {step === 0 && (
                  <>
                    <Field label="Organization name" error={formState.errors.org_name?.message}>
                      <Input {...register('org_name')} autoFocus />
                    </Field>
                    <Field label="Organization email" hint="Used for platform notices; must be unique." error={formState.errors.org_email?.message}>
                      <Input type="email" {...register('org_email')} />
                    </Field>
                    <Field label="Address" error={formState.errors.org_address?.message}>
                      <Input {...register('org_address')} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Phone" optional error={formState.errors.org_phone?.message}>
                        <Input type="tel" {...register('org_phone')} />
                      </Field>
                      <Field label="Website" optional error={formState.errors.org_website?.message}>
                        <Input type="url" placeholder="https://" {...register('org_website')} />
                      </Field>
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <Field label="Admin’s full name" error={formState.errors.admin_full_name?.message}>
                      <Input {...register('admin_full_name')} autoFocus />
                    </Field>
                    <Field label="Admin’s email" error={formState.errors.admin_email?.message}>
                      <Input type="email" {...register('admin_email')} />
                    </Field>
                    <Field label="Temporary password" hint="At least 8 characters. Share it securely." error={formState.errors.admin_password?.message}>
                      <Input type="text" className="type-data" {...register('admin_password')} />
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text">
                        <Building2 className="size-5" />
                      </span>
                      <div>
                        <div className="type-title text-lg text-text">{v.org_name}</div>
                        <div className="text-[13px] text-muted">{v.org_address}</div>
                      </div>
                    </div>
                    <dl>
                      <KeyValue label="Organization email" mono>
                        {v.org_email}
                      </KeyValue>
                      <KeyValue label="Admin">{v.admin_full_name}</KeyValue>
                      <KeyValue label="Admin email" mono>
                        {v.admin_email}
                      </KeyValue>
                      <KeyValue label="Plan">Free (change any time)</KeyValue>
                    </dl>
                    <p className="flex items-start gap-2 text-[12.5px] text-faint">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> The new organization starts fully isolated — no other tenant can see its data.
                    </p>
                    <FormError message={onboard.error && !(isApiError(onboard.error) && onboard.error.isValidation) ? onboard.error.message : null} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
          <div className="mt-5 flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            <Button type="submit" loading={onboard.isPending}>
              {step < 2 ? (
                <>
                  Continue <ArrowRight />
                </>
              ) : (
                'Create organization'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
