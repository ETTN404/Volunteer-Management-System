import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { OrgDocumentType, PlanKey } from '@/shared/types/api';
import { formatBytes } from '@/shared/lib/format';
import { errorMessage, isApiError } from '@/shared/api/http';
import { cn } from '@/shared/lib/cn';
import { Button, Card, CardBody, CardHeader, Checkbox, CitySelect, CountrySelect, Field, FormError, Input, PhoneInput, Segmented, Select, isValidPhone } from '@/shared/ui';

export const ORG_DOC_TYPES: { value: OrgDocumentType; label: string }[] = [
  { value: 'registration_certificate', label: 'Registration certificate' },
  { value: 'operating_license', label: 'Operating license' },
  { value: 'tax_certificate', label: 'Tax (TIN) certificate' },
  { value: 'other', label: 'Other proof' },
];

const schema = z
  .object({
    org_name: z.string().trim().min(2, 'Enter the organization’s name.').max(150),
    org_email: z.string().trim().email('Enter a valid email.').max(100),
    org_country: z.string().length(2, 'Choose a country.'),
    org_city: z.string().trim().min(1, 'Choose a city.').max(100),
    org_address: z.string().max(255).optional(),
    org_phone: z.string().min(1, 'Enter a phone number.'),
    org_website: z.string().trim().url('Use a full address, e.g. https://example.org').or(z.literal('')).optional(),
    admin_first_name: z.string().trim().min(1, 'Enter a first name.').max(60),
    admin_last_name: z.string().trim().min(1, 'Enter a last name.').max(60),
    admin_email: z.string().trim().email('Enter a valid email.').max(100),
    admin_phone: z.string().optional(),
    plan: z.enum(['free', 'pro', 'enterprise']),
    documents: z.array(z.object({ file: z.instanceof(File), type: z.string(), title: z.string().optional() })),
    accept_terms: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!isValidPhone(v.org_phone, v.org_country)) ctx.addIssue({ code: 'custom', path: ['org_phone'], message: 'This isn’t a valid phone number for the selected country.' });
    if (v.admin_phone && !isValidPhone(v.admin_phone, v.org_country)) ctx.addIssue({ code: 'custom', path: ['admin_phone'], message: 'This isn’t a valid phone number.' });
  });

export type OrgOnboardValues = z.infer<typeof schema>;

export function OrgOnboardForm({
  mode,
  submitting,
  error,
  onSubmit,
}: {
  /** platform = SuperAdmin onboarding (plan picker, documents optional); public = self sign-up (documents + terms required). */
  mode: 'platform' | 'public';
  submitting: boolean;
  error: unknown;
  onSubmit: (v: OrgOnboardValues) => Promise<unknown> | void;
}) {
  const form = useForm<OrgOnboardValues>({
    resolver: zodResolver(
      schema.superRefine((v, ctx) => {
        if (mode === 'public' && v.documents.length === 0) ctx.addIssue({ code: 'custom', path: ['documents'], message: 'Upload at least one document so we can verify your organization.' });
        if (mode === 'public' && !v.accept_terms) ctx.addIssue({ code: 'custom', path: ['accept_terms'], message: 'Please accept the terms.' });
      }),
    ),
    defaultValues: {
      org_name: '',
      org_email: '',
      org_country: 'ET',
      org_city: '',
      org_address: '',
      org_phone: '',
      org_website: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_email: '',
      admin_phone: '',
      plan: 'free',
      documents: [],
      accept_terms: false,
    },
  });
  const { register, control, handleSubmit, formState, watch, setValue, setError } = form;
  const country = watch('org_country');
  const docs = watch('documents');
  const dz = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 5,
    onDrop: (files) => setValue('documents', [...docs, ...files.map((f) => ({ file: f, type: 'registration_certificate' as string, title: f.name.replace(/\.[^.]+$/, '') }))].slice(0, 5), { shouldValidate: true }),
  });

  const submit = handleSubmit(async (v) => {
    try {
      await onSubmit(v);
    } catch (e) {
      if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) if (!f.startsWith('documents.')) setError(f as keyof OrgOnboardValues, { message: m[0] });
    }
  });
  const err = formState.errors;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Organization" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={err.org_name?.message} className="sm:col-span-2">
            <Input {...register('org_name')} placeholder="e.g. Mekedonia Humanitarian Association" />
          </Field>
          <Field label="Organization email" error={err.org_email?.message} hint="Used for billing and platform messages.">
            <Input type="email" {...register('org_email')} placeholder="info@organization.org" />
          </Field>
          <Field label="Website" optional error={err.org_website?.message}>
            <Input {...register('org_website')} placeholder="https://" />
          </Field>
          <Field label="Country" error={err.org_country?.message}>
            <Controller
              control={control}
              name="org_country"
              render={({ field }) => (
                <CountrySelect
                  value={field.value}
                  onChange={(c) => {
                    field.onChange(c);
                    setValue('org_city', '');
                  }}
                />
              )}
            />
          </Field>
          <Field label="City" error={err.org_city?.message}>
            <Controller control={control} name="org_city" render={({ field }) => <CitySelect country={country} value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="Street address" optional className="sm:col-span-2">
            <Input {...register('org_address')} placeholder="Sub-city, woreda, building" />
          </Field>
          <Field label="Phone" error={err.org_phone?.message} hint="The country code follows the selected country.">
            <Controller control={control} name="org_phone" render={({ field }) => <PhoneInput country={country} value={field.value} onChange={field.onChange} />} />
          </Field>
          {mode === 'platform' && (
            <Field label="Plan">
              <Controller
                control={control}
                name="plan"
                render={({ field }) => (
                  <Segmented
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as PlanKey)}
                    aria-label="Plan"
                    options={[
                      { value: 'free', label: 'Free' },
                      { value: 'pro', label: 'Pro' },
                      { value: 'enterprise', label: 'Enterprise' },
                    ]}
                  />
                )}
              />
            </Field>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Administrator" description="Gets an invitation email with a temporary password and a one-time link. Nobody types a password for them." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={err.admin_first_name?.message}>
            <Input {...register('admin_first_name')} autoComplete="given-name" />
          </Field>
          <Field label="Last name" error={err.admin_last_name?.message}>
            <Input {...register('admin_last_name')} autoComplete="family-name" />
          </Field>
          <Field label="Email" error={err.admin_email?.message}>
            <Input type="email" {...register('admin_email')} autoComplete="email" />
          </Field>
          <Field label="Mobile" optional error={err.admin_phone?.message}>
            <Controller control={control} name="admin_phone" render={({ field }) => <PhoneInput country={country} value={field.value} onChange={field.onChange} />} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Verification documents"
          description={mode === 'public' ? 'Required. Volunteers only see your events after the VolunTrack team checks these.' : 'Optional when onboarding yourself — organizations onboarded here are verified immediately.'}
        />
        <CardBody className="space-y-3">
          <div
            {...dz.getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-4 py-8 text-center transition-colors hover:border-accent',
              dz.isDragActive && 'border-accent bg-accent-soft',
              err.documents && 'border-danger',
            )}
          >
            <input {...dz.getInputProps()} />
            <FileUp className="size-6 text-accent-text" />
            <div className="text-sm font-medium text-text">Drop PDFs or photos, or click to choose</div>
            <div className="text-xs text-faint">Registration certificate, license or TIN · up to 5 files · 5 MB each</div>
          </div>
          {err.documents && <p className="text-[12.5px] text-danger-text">{err.documents.message}</p>}
          {dz.fileRejections.length > 0 && <p className="text-[12.5px] text-danger-text">Some files were too large or not PDF/JPG/PNG.</p>}
          {docs.map((d, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">{d.file.name}</div>
                <div className="text-xs text-faint">{formatBytes(d.file.size)}</div>
              </div>
              <div className="sm:w-56">
                <Select
                  size="sm"
                  aria-label="Document type"
                  value={d.type}
                  onValueChange={(t) => setValue('documents', docs.map((x, j) => (j === i ? { ...x, type: t } : x)))}
                  options={ORG_DOC_TYPES}
                />
              </div>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove file" onClick={() => setValue('documents', docs.filter((_, j) => j !== i), { shouldValidate: true })}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      {mode === 'public' && (
        <Controller
          control={control}
          name="accept_terms"
          render={({ field }) => (
            <div>
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
                label="I represent this organization and confirm the information is true."
                description="You start on the Free plan. Upgrade any time from Billing."
              />
              {err.accept_terms && <p className="mt-1 text-[12.5px] text-danger-text">{err.accept_terms.message}</p>}
            </div>
          )}
        />
      )}

      <FormError message={error && !(isApiError(error) && error.isValidation) ? errorMessage(error) : isApiError(error) && error.isValidation ? error.message : null} />
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>
          {mode === 'public' ? 'Create organization' : 'Onboard & send invitation'}
        </Button>
      </div>
    </form>
  );
}
