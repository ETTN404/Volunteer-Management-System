import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Check, Clock4, ExternalLink, FileUp, ImageUp, Palette, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AttendancePolicy, OrgDocumentType } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { BRAND_SWATCHES, isHex, onColor } from '@/shared/lib/color';
import { formatBytes } from '@/shared/lib/format';
import { formatDate } from '@/shared/lib/time';
import { errorMessage, isApiError } from '@/shared/api/http';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CitySelect,
  CountrySelect,
  ErrorState,
  Field,
  FormError,
  InlineAlert,
  Input,
  LogoMark,
  PageHeader,
  PhoneInput,
  Select,
  Skeleton,
  Switch,
  Textarea,
  isValidPhone,
  notify,
} from '@/shared/ui';
import { useOrgDocuments, useOrganization, useRemoveLogo, useUpdateOrganization, useUploadLogo, useUploadOrgDocument } from '@/features/organization/api';
import { PlanLocked } from '@/features/organization/plan-notice';
import { ORG_DOC_TYPES } from '@/features/platform/org-onboard-form';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Your organization needs a name.').max(150),
    country: z.string(),
    city: z.string().max(100),
    address: z.string().trim().max(255),
    phone: z.string(),
    website: z.union([z.literal(''), z.string().trim().url('Enter a full URL, e.g. https://example.org')]),
    about: z.string().max(1500, 'Keep it under 1,500 characters.'),
    primary_color: z.union([z.literal(''), z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #E5483D')]),
    subdomain: z.union([z.literal(''), z.string().regex(/^[a-z0-9-]{3,40}$/, 'Lowercase letters, numbers and dashes only')]),
  })
  .refine((v) => !v.phone || isValidPhone(v.phone, v.country || undefined), { path: ['phone'], message: 'This isn’t a valid number for your country.' });
type Values = z.infer<typeof schema>;

const POLICY_FIELDS: { key: keyof AttendancePolicy; label: string; hint: string; unit: string; min: number; max: number }[] = [
  { key: 'checkin_before_minutes', label: 'Check-in opens', hint: 'Minutes before the shift starts', unit: 'min before', min: 0, max: 120 },
  { key: 'checkin_after_minutes', label: 'Check-in closes', hint: 'Minutes after the shift starts', unit: 'min after', min: 5, max: 240 },
  { key: 'early_checkout_minutes', label: 'Leaving early', hint: 'Leaving more than this before the end asks for a reason and alerts coordinators', unit: 'min', min: 0, max: 240 },
  { key: 'undo_checkout_minutes', label: 'Undo a mistaken check-out', hint: 'Volunteers can resume their shift within', unit: 'min', min: 0, max: 60 },
  { key: 'auto_checkout_grace', label: 'Automatic check-out', hint: 'Open check-ins close at the scheduled end once this much time has passed', unit: 'min after end', min: 0, max: 720 },
  { key: 'max_gps_accuracy', label: 'Weakest GPS accepted', hint: 'Readings less precise than this are refused', unit: 'm', min: 20, max: 1000 },
  { key: 'ping_interval_minutes', label: 'Presence check', hint: 'While the app is open, location is confirmed every', unit: 'min', min: 1, max: 60 },
];

function PolicyCard({ policy, onSave, saving }: { policy: AttendancePolicy; onSave: (p: Partial<AttendancePolicy>) => void; saving: boolean }) {
  const [p, setP] = useState(policy);
  useEffect(() => setP(policy), [policy]);
  const dirty = JSON.stringify(p) !== JSON.stringify(policy);
  return (
    <Card>
      <CardHeader title="Check-in & check-out rules" description="Applies to every event of your organization." />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {POLICY_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={p[f.key] as number}
                  onChange={(e) => setP({ ...p, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || 0)) })}
                  className="type-data w-24"
                />
                <span className="text-[12.5px] text-muted">{f.unit}</span>
              </div>
            </Field>
          ))}
          <Field label="QR code changes every" hint="Shorter is safer; longer is easier on slow phones.">
            <Select
              value={String(p.qr_window_seconds)}
              onValueChange={(v) => setP({ ...p, qr_window_seconds: Number(v) })}
              options={[15, 30, 60, 120].map((s) => ({ value: String(s), label: `${s} seconds` }))}
            />
          </Field>
        </div>
        <label className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5">
          <span className="text-sm">
            <span className="font-medium text-text">Require the live QR code</span>
            <span className="block text-muted">Turn off only for remote or field events where no coordinator is present (GPS is still checked).</span>
          </span>
          <Switch checked={p.require_qr} onCheckedChange={(v) => setP({ ...p, require_qr: v })} />
        </label>
        <label className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5">
          <span className="text-sm">
            <span className="font-medium text-text">Auto-verify clean attendance</span>
            <span className="block text-muted">Hours with a QR + GPS check-in and no warnings count immediately; anything flagged still waits for you.</span>
          </span>
          <Switch checked={p.auto_verify_hours} onCheckedChange={(v) => setP({ ...p, auto_verify_hours: v })} />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" disabled={!dirty} onClick={() => setP(policy)}>
            Discard
          </Button>
          <Button type="button" disabled={!dirty} loading={saving} onClick={() => onSave(p)}>
            Save rules
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function VerificationCard({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const docs = useOrgDocuments();
  const upload = useUploadOrgDocument();
  const [type, setType] = useState<OrgDocumentType>('registration_certificate');
  const drop = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    onDrop: (files, rejected) => {
      if (rejected[0]) return notify.warning('That file can’t be used', 'PDF, JPG or PNG up to 5 MB.');
      const f = files[0];
      if (f) upload.mutate({ file: f, document_type: type, title: f.name.replace(/\.[^.]+$/, '') }, { onSuccess: () => notify.success('Document sent for review'), onError: (e) => notify.error(errorMessage(e)) });
    },
  });
  return (
    <Card>
      <CardHeader
        title="Verification"
        description="Volunteers only see organizations the VolunTrack team has verified."
        action={
          <Badge tone={status === 'verified' ? 'success' : status === 'rejected' ? 'danger' : 'warning'} dot>
            {status === 'verified' ? 'Verified' : status === 'rejected' ? 'Needs attention' : 'Under review'}
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        {status !== 'verified' && (
          <InlineAlert tone={status === 'rejected' ? 'danger' : 'info'} icon={status === 'rejected' ? undefined : <Clock4 />}>
            {status === 'rejected' ? 'Your documents were not accepted. Upload a clearer or newer copy.' : 'Your events stay hidden from volunteers until verification is complete (usually 2 business days).'}
          </InlineAlert>
        )}
        <ul className="space-y-2">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm">
              <a href={d.file_url ?? '#'} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-text hover:text-accent-text">
                {d.title}
              </a>
              <span className="hidden text-xs text-faint sm:inline">
                {formatBytes(d.file_size_bytes)} · {formatDate(d.created_at, 'd MMM yyyy')}
              </span>
              <Badge size="sm" tone={d.status === 'verified' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'}>
                {d.status}
              </Badge>
            </li>
          ))}
          {docs.data?.length === 0 && <li className="text-sm text-muted">No documents uploaded yet.</li>}
        </ul>
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <Select value={type} onValueChange={(v) => setType(v as OrgDocumentType)} options={ORG_DOC_TYPES} aria-label="Document type" />
          <div {...drop.getRootProps()} className={cn('flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm', drop.isDragActive ? 'border-accent bg-accent-soft' : 'border-line-strong hover:bg-surface-2')}>
            <input {...drop.getInputProps()} aria-label="Upload verification document" />
            <FileUp className="size-4 text-accent-text" /> {upload.isPending ? 'Uploading…' : 'Upload a document'}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function OrgSettingsPage() {
  const org = useOrganization();
  const update = useUpdateOrganization();
  const logo = useUploadLogo();
  const removeLogo = useRemoveLogo();
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const { register, control, handleSubmit, reset, watch, setValue, formState, setError } = form;
  const color = watch('primary_color');
  const name = watch('name');
  const country = watch('country');
  const features = org.data?.billing?.features ?? [];
  const canBrand = features.includes('branding');
  const canSubdomain = features.includes('subdomain');

  useEffect(() => {
    document.title = 'Settings · VolunTrack';
  }, []);
  useEffect(() => {
    const o = org.data;
    if (o)
      reset({
        name: o.name,
        country: o.country ?? 'ET',
        city: o.city ?? '',
        address: o.address ?? '',
        phone: o.phone ?? '',
        website: o.website ?? '',
        about: o.about ?? '',
        primary_color: o.primary_color ?? '',
        subdomain: o.subdomain ?? '',
      });
  }, [org.data, reset]);

  const drop = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'image/svg+xml': ['.svg'] },
    maxSize: 1024 * 1024,
    multiple: false,
    onDrop: (files, rejected) => {
      if (rejected[0]) return notify.warning('That logo can’t be used', 'Use a PNG, JPEG, WebP or SVG up to 1 MB.');
      if (files[0]) logo.mutate(files[0], { onSuccess: () => notify.success('Logo updated'), onError: (e) => notify.error(e) });
    },
  });

  if (org.isLoading) return <Skeleton className="h-[640px] rounded-xl" />;
  if (org.error || !org.data) return <ErrorState error={org.error} onRetry={() => org.refetch()} />;

  const onSubmit = handleSubmit((v) =>
    update.mutate(
      {
        name: v.name,
        country: v.country || null,
        city: v.city || null,
        address: v.address || null,
        phone: v.phone || null,
        website: v.website || null,
        about: v.about.trim() || null,
        ...(canBrand ? { primary_color: v.primary_color || null } : {}),
        ...(canSubdomain ? { subdomain: v.subdomain || null } : {}),
      },
      {
        onSuccess: () => notify.success('Settings saved'),
        onError: (e) => {
          if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof Values, { message: m[0] });
        },
      },
    ),
  );
  const preview = isHex(color) ? color : '#3341B8';

  return (
    <>
      <PageHeader eyebrow="Organization" title="Settings & brand" description="How your organization appears to volunteers, and how check-in works at your events." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <Card>
              <CardHeader title="Details" />
              <CardBody className="space-y-5">
                <Field label="Organization name" error={formState.errors.name?.message}>
                  <Input {...register('name')} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Country">
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <CountrySelect
                          value={field.value}
                          onChange={(c) => {
                            field.onChange(c);
                            setValue('city', '', { shouldDirty: true });
                          }}
                        />
                      )}
                    />
                  </Field>
                  <Field label="City" error={formState.errors.city?.message}>
                    <Controller control={control} name="city" render={({ field }) => <CitySelect country={country} value={field.value} onChange={field.onChange} />} />
                  </Field>
                </div>
                <Field label="Street address" optional error={formState.errors.address?.message}>
                  <Input {...register('address')} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Phone" optional error={formState.errors.phone?.message}>
                    <Controller control={control} name="phone" render={({ field }) => <PhoneInput country={country} value={field.value} onChange={field.onChange} />} />
                  </Field>
                  <Field label="Website" optional error={formState.errors.website?.message}>
                    <Input type="url" {...register('website')} placeholder="https://" />
                  </Field>
                </div>
                <Field
                  label="About"
                  optional
                  hint="Shown on your public page — what you do and who you help."
                  error={formState.errors.about?.message}
                  aside={
                    <a href={`/orgs/${org.data.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-text hover:underline">
                      Public page <ExternalLink className="size-3" />
                    </a>
                  }
                >
                  <Textarea rows={4} {...register('about')} placeholder="We run blood drives and first-aid training across Addis Ababa…" />
                </Field>
                <Field label="Email" hint="Contact the platform team (Messages) to change your organization’s email.">
                  <Input value={org.data.email} disabled readOnly />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Brand" description="Your logo shows on every event. Pro adds your own color across the workspace." />
              <CardBody className="space-y-5">
                <div>
                  <div className="mb-1.5 text-[13px] font-medium text-text">Logo</div>
                  <div className="flex items-center gap-3">
                    <div {...drop.getRootProps()} className={cn('flex flex-1 cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors', drop.isDragActive ? 'border-accent bg-accent-soft' : 'border-line-strong hover:bg-surface-2')}>
                      <input {...drop.getInputProps()} aria-label="Upload logo" />
                      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                        {org.data.logo_url ? <img src={org.data.logo_url} alt="" className="size-full object-contain" /> : <ImageUp className="size-5 text-faint" />}
                      </span>
                      <span className="text-sm">
                        <span className="font-medium text-text">{logo.isPending ? 'Uploading…' : 'Drop a logo or click to choose'}</span>
                        <span className="block text-[12.5px] text-faint">PNG, JPEG, WebP or SVG · up to 1 MB · square works best</span>
                      </span>
                    </div>
                    {org.data.logo_url && (
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove logo" onClick={() => removeLogo.mutate(undefined, { onSuccess: () => notify.success('Logo removed') })}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                <PlanLocked locked={!canBrand} plan="Pro">
                  <Field label="Primary color" error={formState.errors.primary_color?.message}>
                    <div className="flex flex-wrap items-center gap-2">
                      {BRAND_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Use ${c}`}
                          onClick={() => setValue('primary_color', c, { shouldDirty: true, shouldValidate: true })}
                          className={cn('grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110', color?.toLowerCase() === c.toLowerCase() && 'ring-2 ring-text')}
                          style={{ background: c }}
                        >
                          {color?.toLowerCase() === c.toLowerCase() && <Check className="size-4" style={{ color: onColor(c) }} strokeWidth={3} />}
                        </button>
                      ))}
                      <Input {...register('primary_color')} placeholder="#3341B8" className="type-data ml-1 w-32 uppercase" inputSize="sm" aria-label="Hex color" />
                      <button type="button" className="text-[12.5px] text-faint hover:text-muted" onClick={() => setValue('primary_color', '', { shouldDirty: true })}>
                        Use default
                      </button>
                    </div>
                  </Field>
                </PlanLocked>
                <PlanLocked locked={!canSubdomain} plan="Enterprise">
                  <Field label="Subdomain" optional hint="A short address for your volunteers." error={formState.errors.subdomain?.message}>
                    <div className="flex items-center">
                      <Input {...register('subdomain')} placeholder="redcross" className="type-data rounded-r-none" />
                      <span className="type-data flex h-10 items-center rounded-r-md bg-surface-2 px-3 text-[13px] text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">.voluntrack.org</span>
                    </div>
                  </Field>
                </PlanLocked>
              </CardBody>
            </Card>
            <FormError message={update.error && !(isApiError(update.error) && update.error.isValidation) ? errorMessage(update.error) : null} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => reset()} disabled={!formState.isDirty}>
                Discard
              </Button>
              <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
                Save settings
              </Button>
            </div>
          </form>

          {org.data.settings?.attendance && (
            <PolicyCard
              policy={org.data.settings.attendance}
              saving={update.isPending}
              onSave={(attendance) => update.mutate({ attendance }, { onSuccess: () => notify.success('Check-in rules saved'), onError: (e) => notify.error(errorMessage(e)) })}
            />
          )}
          <VerificationCard status={org.data.verification_status ?? 'verified'} />
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="type-eyebrow flex items-center gap-2">
            <Palette className="size-3.5" /> Preview
          </div>
          <div className="overflow-hidden rounded-2xl bg-sunken [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]" style={{ ['--accent' as string]: preview, ['--accent-fg' as string]: onColor(preview) }}>
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              {org.data.logo_url ? <img src={org.data.logo_url} alt="" className="size-8 rounded-md object-contain" /> : <LogoMark className="size-8" />}
              <div>
                <div className="flex items-center gap-1 text-[13.5px] font-semibold text-text">
                  {name || 'Organization'}
                  {org.data.verification_status === 'verified' && <BadgeCheck className="size-3.5 text-accent-text" />}
                </div>
                <div className="type-eyebrow-sm">Volunteer</div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-xl p-4" style={{ background: `color-mix(in oklab, ${preview} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${preview} 35%, transparent)` }}>
                <div className="type-eyebrow-sm">Your next shift</div>
                <div className="type-title mt-1.5 text-[15px] text-text">Community health fair</div>
                <span className="mt-3 inline-flex rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: preview, color: onColor(preview) }}>
                  Check in now
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full w-2/3 rounded-full" style={{ background: preview }} />
              </div>
            </div>
          </div>
          <p className="flex items-start gap-2 text-[12.5px] text-faint">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Plan: {org.data.billing?.plan_name ?? 'Free'}
            {org.data.plan_expires_at ? ` · renews by ${formatDate(org.data.plan_expires_at, 'd MMM yyyy')}` : ''}
          </p>
        </div>
      </div>
    </>
  );
}
