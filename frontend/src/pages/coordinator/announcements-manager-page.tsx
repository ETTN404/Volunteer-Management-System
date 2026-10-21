import { zodResolver } from '@hookform/resolvers/zod';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatRelative } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, FormError, Input, PageHeader, Segmented, SkeletonCard, Textarea, notify } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { AUDIENCE_LABEL, useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/features/announcements/api';
import type { Audience } from '@/shared/types/api';

// Mirrors CreateAnnouncementRequest
const schema = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(200),
  message: z.string().trim().min(1, 'Write the message.').max(5000),
  target_audience: z.enum(['all', 'volunteers', 'coordinators']),
});

export default function AnnouncementsManagerPage() {
  const list = useAnnouncements();
  const create = useCreateAnnouncement();
  const remove = useDeleteAnnouncement();
  const { register, control, handleSubmit, reset, formState, watch } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { title: '', message: '', target_audience: 'all' } });
  useEffect(() => {
    document.title = 'Announcements · VolunTrack';
  }, []);
  const msg = watch('message');

  return (
    <>
      <PageHeader eyebrow="Outreach" title="Announcements" description="Post updates to your organization. VolunBot also reads the latest ones when volunteers ask questions." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader title="New announcement" />
          <CardBody>
            <form
              noValidate
              className="space-y-4"
              onSubmit={handleSubmit((v) =>
                create.mutate(v, {
                  onSuccess: (r) => {
                    notify.success('Announcement posted', r.message ?? `Sent to ${AUDIENCE_LABEL[v.target_audience].toLowerCase()}.`);
                    reset();
                  },
                }),
              )}
            >
              <FormError message={create.error ? errorMessage(create.error) : null} />
              <Controller
                control={control}
                name="target_audience"
                render={({ field }) => (
                  <Field label="Who sees it">
                    <Segmented
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as Audience)}
                      aria-label="Audience"
                      options={[
                        { value: 'all', label: 'Everyone' },
                        { value: 'volunteers', label: 'Volunteers' },
                        { value: 'coordinators', label: 'Coordinators' },
                      ]}
                    />
                  </Field>
                )}
              />
              <Field label="Title" error={formState.errors.title?.message}>
                <Input {...register('title')} placeholder="Blood drive: bring your ID and water" />
              </Field>
              <Field label="Message" error={formState.errors.message?.message} hint={`${msg.length}/5000`}>
                <Textarea rows={6} {...register('message')} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" loading={create.isPending}>
                  <Send /> Post announcement
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
        <section>
          <h2 className="type-title mb-4 text-lg text-text">Posted</h2>
          {list.isLoading ? (
            <SkeletonCard className="h-32" />
          ) : list.data?.items.length ? (
            <Stagger className="space-y-3">
              {list.data.items.map((a) => (
                <StaggerItem key={a.id}>
                  <Card className="min-w-0 p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-faint">
                      {a.kind === 'urgent' && (
                        <Badge size="sm" tone="danger">
                          Urgent alert
                        </Badge>
                      )}
                      <Badge size="sm" tone={a.target_audience === 'all' ? 'accent' : 'neutral'}>
                        {AUDIENCE_LABEL[a.target_audience]}
                      </Badge>
                      {formatRelative(a.created_at)}
                      {a.recipients_count != null && <span>· delivered to {a.recipients_count}</span>}
                      <button
                        type="button"
                        className="ml-auto rounded p-1 text-faint hover:bg-surface-2 hover:text-danger-text"
                        aria-label="Delete announcement"
                        onClick={() => window.confirm('Remove this announcement?') && remove.mutate(a.id, { onSuccess: () => notify.success('Announcement removed') })}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-text wrap-anywhere">{a.title}</h3>
                    <p className="mt-1.5 line-clamp-3 text-sm whitespace-pre-line text-muted wrap-anywhere">{a.message}</p>
                    {a.poster && <p className="mt-2 text-[11.5px] text-faint">by {a.poster.full_name}</p>}
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState icon={<Megaphone />} title="Nothing posted yet" description="Your first announcement will appear here." compact />
          )}
        </section>
      </div>
    </>
  );
}
