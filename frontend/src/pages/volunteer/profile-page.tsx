import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Camera, Check, Clock4, ShieldQuestion, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/shared/lib/cn';
import { AVAILABILITY_SLOTS, SKILL_CATALOGUE, normalizeAvailability, normalizeSkill } from '@/shared/lib/skills';
import { humanizeSkill } from '@/shared/lib/format';
import { formatDate } from '@/shared/lib/time';
import { errorMessage, isApiError } from '@/shared/api/http';
import { Avatar, Button, Card, CardBody, CardHeader, DatePicker, ErrorState, Field, FormError, Input, PageHeader, PhoneInput, Skeleton, TagInput, Textarea, isValidPhone, notify } from '@/shared/ui';
import { useUploadPhoto } from '@/features/auth/api';
import { useSession } from '@/features/auth/use-session';
import { useUpdateProfile, useVolunteerProfile } from '@/features/volunteer/api';
import type { SkillVerificationStatus } from '@/shared/types/api';

// Mirrors App\Http\Requests\UpdateVolunteerProfileRequest
const schema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(60),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(60),
  phone: z.string().refine((v) => !v || isValidPhone(v), 'Enter a valid phone number.'),
  bio: z.string().max(1000, 'Keep your bio under 1,000 characters.'),
  skills: z.array(z.string().max(100)),
  availability: z.array(z.string().max(100)),
  date_of_birth: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const VERIFY: Record<SkillVerificationStatus, { icon: typeof Check; label: string; cls: string }> = {
  verified: { icon: BadgeCheck, label: 'Verified', cls: 'text-success-text' },
  pending: { icon: Clock4, label: 'Under review', cls: 'text-warning-text' },
  rejected: { icon: XCircle, label: 'Not verified', cls: 'text-danger-text' },
  unverified: { icon: ShieldQuestion, label: 'Add a document to verify', cls: 'text-faint' },
};

export default function ProfilePage() {
  const { user } = useSession();
  const profile = useVolunteerProfile();
  const update = useUpdateProfile();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { first_name: '', last_name: '', phone: '', bio: '', skills: [], availability: [], date_of_birth: '' } });
  const photo = useUploadPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, control, handleSubmit, reset, formState, setError } = form;

  useEffect(() => {
    document.title = 'Profile & skills · VolunTrack';
  }, []);
  useEffect(() => {
    const v = profile.data?.volunteer;
    if (v) {
      reset({
        first_name: v.user?.first_name ?? user?.first_name ?? (v.user?.full_name ?? '').split(' ')[0] ?? '',
        last_name: v.user?.last_name ?? user?.last_name ?? (v.user?.full_name ?? '').split(' ').slice(1).join(' '),
        phone: v.user?.phone ?? user?.phone ?? '',
        bio: v.bio ?? '',
        skills: v.skills,
        availability: normalizeAvailability(v.availability),
        date_of_birth: v.date_of_birth ?? '',
      });
    }
  }, [profile.data, reset, user?.full_name]);

  if (profile.error) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;
  const v = profile.data?.volunteer;
  const verification = v?.skills_verification ?? {};

  const onSubmit = handleSubmit((values) =>
    update.mutate(
      { ...values, phone: values.phone || null, date_of_birth: values.date_of_birth || null },
      {
        onSuccess: () => notify.success('Profile saved', 'Shift matches update with your new skills.'),
        onError: (e) => {
          if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof Values, { message: m[0] });
        },
      },
    ),
  );

  return (
    <>
      <PageHeader eyebrow="Profile" title="Profile & skills" description="Your skills decide which shifts are ranked first for you." />
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="About you" />
            <CardBody className="space-y-5">
              {!v ? (
                <Skeleton className="h-40" />
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-focus"
                      aria-label="Change profile photo"
                    >
                      <Avatar name={user?.full_name ?? ''} src={user?.profile_photo_url} size="lg" />
                      <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="size-5" />
                      </span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        if (f.size > 2 * 1024 * 1024) return void notify.error('Photo is larger than 2 MB');
                        photo.mutate(f, { onSuccess: () => notify.success('Photo updated'), onError: (err) => notify.error(errorMessage(err)) });
                      }}
                    />
                    <div className="min-w-0 text-sm text-muted">
                      <div className="truncate font-medium text-text">{user?.email}</div>
                      Member since {formatDate(v.created_at, 'MMMM yyyy')}
                      <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 block text-[12.5px] font-medium text-accent-text hover:underline">
                        {photo.isPending ? 'Uploading…' : user?.profile_photo_url ? 'Change photo' : 'Add a photo'}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" error={formState.errors.first_name?.message}>
                      <Input {...register('first_name')} autoComplete="given-name" />
                    </Field>
                    <Field label="Last name" error={formState.errors.last_name?.message}>
                      <Input {...register('last_name')} autoComplete="family-name" />
                    </Field>
                  </div>
                  <Field label="Phone" optional hint="Coordinators use it to reach you about a shift." error={formState.errors.phone?.message}>
                    <Controller control={control} name="phone" render={({ field }) => <PhoneInput country="ET" value={field.value} onChange={field.onChange} />} />
                  </Field>
                  <Field label="Bio" optional error={formState.errors.bio?.message}>
                    <Textarea rows={4} {...register('bio')} placeholder="Languages you speak, experience, what you love doing…" />
                  </Field>
                  <Field label="Date of birth" optional hint="Only used to check if parental consent is needed (under 18).">
                    <Controller
                      control={control}
                      name="date_of_birth"
                      render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} max={new Date().toISOString().slice(0, 10)} placeholder="Select your birthday" />}
                    />
                  </Field>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Skills" description="Pick from the list or add your own." />
            <CardBody>
              <Controller control={control} name="skills" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} suggestions={SKILL_CATALOGUE} normalize={normalizeSkill} max={20} />} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Availability" description="When you can usually volunteer." />
            <CardBody>
              <Controller
                control={control}
                name="availability"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {AVAILABILITY_SLOTS.map((slot) => {
                      const on = field.value.includes(slot.key);
                      return (
                        <button
                          key={slot.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((x) => x !== slot.key) : [...field.value, slot.key])}
                          className={cn('flex h-11 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors', on ? 'bg-accent-soft text-accent-text [box-shadow:inset_0_0_0_1px_var(--accent)]' : 'bg-sunken text-muted [box-shadow:inset_0_0_0_1px_var(--line)] hover:text-text')}
                        >
                          <span className={cn('grid size-4 place-items-center rounded-[4px]', on ? 'bg-accent text-accent-fg' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]')}>{on && <Check className="size-2.5" strokeWidth={4} />}</span>
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </CardBody>
          </Card>
          <FormError message={update.error && !(isApiError(update.error) && update.error.isValidation) ? update.error.message : null} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" disabled={!formState.isDirty} onClick={() => reset()}>
              Discard changes
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
              Save profile
            </Button>
          </div>
        </div>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader title="Skill verification" description="Coordinators verify skills against your documents." />
          <CardBody>
            <ul className="space-y-2">
              {(v?.skills ?? []).map((s) => {
                const st = VERIFY[verification[s] ?? 'unverified'];
                return (
                  <li key={s} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
                    <span className="text-[14px] font-medium text-text">{humanizeSkill(s)}</span>
                    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px]', st.cls)}>
                      <st.icon className="size-3.5" />
                      {st.label}
                    </span>
                  </li>
                );
              })}
              {v && v.skills.length === 0 && <li className="text-sm text-muted">Add skills to get matched to shifts.</li>}
            </ul>
          </CardBody>
        </Card>
      </form>
    </>
  );
}
