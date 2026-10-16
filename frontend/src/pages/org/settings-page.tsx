import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ImageUp, Palette } from 'lucide-react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/shared/lib/cn';
import { BRAND_SWATCHES, isHex, onColor } from '@/shared/lib/color';
import { isApiError } from '@/shared/api/http';
import { Button, Card, CardBody, CardHeader, ErrorState, Field, FormError, Input, LogoMark, PageHeader, Skeleton, notify } from '@/shared/ui';
import { useOrganization, useUpdateOrganization, useUploadLogo } from '@/features/organization/api';

// Mirrors UpdateOrganizationRequest (+ PENDING-BE branding fields, G20)
const schema = z.object({
  name: z.string().trim().min(1, 'Your organization needs a name.').max(150),
  address: z.string().trim().max(255),
  phone: z.string().trim().max(50),
  website: z.union([z.literal(''), z.string().trim().url('Enter a full URL, e.g. https://example.org')]),
  primary_color: z.union([z.literal(''), z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #E5483D')]),
  subdomain: z.union([z.literal(''), z.string().regex(/^[a-z0-9-]{2,40}$/, 'Lowercase letters, numbers and dashes only')]),
});
type Values = z.infer<typeof schema>;

export default function OrgSettingsPage() {
  const org = useOrganization();
  const update = useUpdateOrganization();
  const logo = useUploadLogo();
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, reset, watch, setValue, formState, setError } = form;
  const color = watch('primary_color');
  const name = watch('name');

  useEffect(() => {
    document.title = 'Settings · VolunTrack';
  }, []);
  useEffect(() => {
    const o = org.data;
    if (o) reset({ name: o.name, address: o.address ?? '', phone: o.phone ?? '', website: o.website ?? '', primary_color: o.primary_color ?? '', subdomain: o.subdomain ?? '' });
  }, [org.data, reset]);

  const drop = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/svg+xml': ['.svg'] },
    maxSize: 1024 * 1024,
    multiple: false,
    onDrop: (files, rejected) => {
      if (rejected[0]) return notify.warning('That logo can’t be used', 'Use a PNG, JPEG or SVG up to 1 MB.');
      if (files[0]) logo.mutate(files[0], { onSuccess: () => notify.success('Logo updated'), onError: (e) => notify.error(e) });
    },
  });

  if (org.isLoading) return <Skeleton className="h-[640px] rounded-xl" />;
  if (org.error) return <ErrorState error={org.error} onRetry={() => org.refetch()} />;

  const onSubmit = handleSubmit((v) =>
    update.mutate(
      { name: v.name, address: v.address, phone: v.phone || null, website: v.website || null, primary_color: v.primary_color || null, subdomain: v.subdomain || null },
      {
        onSuccess: () => notify.success('Settings saved'),
        onError: (e) => {
          if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof Values, { message: m[0] });
        },
      },
    ),
  );
  const preview = isHex(color) ? color : '#FFB238';

  return (
    <>
      <PageHeader eyebrow="Organization" title="Settings & brand" description="How your organization appears to volunteers and staff." />
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-5">
              <Field label="Organization name" error={formState.errors.name?.message}>
                <Input {...register('name')} />
              </Field>
              <Field label="Address" error={formState.errors.address?.message}>
                <Input {...register('address')} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone" optional error={formState.errors.phone?.message}>
                  <Input type="tel" {...register('phone')} placeholder="+251 …" />
                </Field>
                <Field label="Website" optional error={formState.errors.website?.message}>
                  <Input type="url" {...register('website')} placeholder="https://" />
                </Field>
              </div>
              <Field label="Email" hint="Contact the platform team to change your organization’s login email.">
                <Input value={org.data?.email} disabled readOnly />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Brand" description="Your color becomes the accent across your workspace for staff and volunteers." />
            <CardBody className="space-y-5">
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
                  <Input {...register('primary_color')} placeholder="#E5483D" className="type-data ml-1 w-32 uppercase" inputSize="sm" aria-label="Hex color" />
                  <button type="button" className="text-[12.5px] text-faint hover:text-muted" onClick={() => setValue('primary_color', '', { shouldDirty: true })}>
                    Use default
                  </button>
                </div>
              </Field>
              <Field label="Subdomain" optional hint="Volunteers can sign in at this address." error={formState.errors.subdomain?.message}>
                <div className="flex items-center">
                  <Input {...register('subdomain')} placeholder="redcross" className="type-data rounded-r-none" />
                  <span className="type-data flex h-10 items-center rounded-r-md bg-surface-2 px-3 text-[13px] text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">.voluntrack.org</span>
                </div>
              </Field>
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-text">Logo</div>
                <div {...drop.getRootProps()} className={cn('flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors', drop.isDragActive ? 'border-accent bg-accent-soft' : 'border-line-strong hover:bg-surface-2')}>
                  <input {...drop.getInputProps()} aria-label="Upload logo" />
                  <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                    {org.data?.logo_url ? <img src={org.data.logo_url} alt="" className="size-full object-contain" /> : <ImageUp className="size-5 text-faint" />}
                  </span>
                  <span className="text-sm">
                    <span className="font-medium text-text">{logo.isPending ? 'Uploading…' : 'Drop a logo or click to choose'}</span>
                    <span className="block text-[12.5px] text-faint">PNG, JPEG or SVG · up to 1 MB · square works best</span>
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
          <FormError message={update.error && !(isApiError(update.error) && update.error.isValidation) ? update.error.message : null} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => reset()} disabled={!formState.isDirty}>
              Discard
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
              Save settings
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="type-eyebrow mb-3 flex items-center gap-2">
            <Palette className="size-3.5" /> Preview
          </div>
          <div className="overflow-hidden rounded-2xl bg-sunken [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]" style={{ ['--accent' as string]: preview, ['--accent-fg' as string]: onColor(preview) }}>
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              {org.data?.logo_url ? <img src={org.data.logo_url} alt="" className="size-8 rounded-md object-contain" /> : <LogoMark className="size-8" />}
              <div>
                <div className="text-[13.5px] font-semibold text-text">{name || 'Organization'}</div>
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
        </div>
      </form>
    </>
  );
}
