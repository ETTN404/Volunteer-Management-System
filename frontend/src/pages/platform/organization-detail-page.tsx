import { ArrowLeft, BadgeCheck, FileText, Flag, Globe, Mail, MapPin, MessageSquare, Phone, Send, Settings2, ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { formatBytes, formatNumber } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Dialog, DialogActions, DialogContent, ErrorState, KeyValue, PageHeader, Skeleton, Textarea, countryName, formatPhone, notify } from '@/shared/ui';
import { REPORT_CATEGORY_LABEL, useOrganizationDetail, usePlatformAudit, useResendInvite, useReviewVerification } from '@/features/platform/api';
import { OrgStatusDialog } from '@/features/platform/org-status-dialog';
import { actionLabel } from '@/features/audit/audit-trail';
import { LIMIT_LABELS } from '@/features/organization/api';

export default function OrganizationDetailPage() {
  const id = Number(useParams().orgId);
  const detail = useOrganizationDetail(id);
  const audit = usePlatformAudit({ org_id: id });
  const review = useReviewVerification();
  const resend = useResendInvite();
  const [managing, setManaging] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (detail.data) document.title = `${detail.data.organization.name} · VolunTrack`;
  }, [detail.data]);

  if (detail.isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (detail.error || !detail.data) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const d = detail.data;
  const o = d.organization;
  const vs = o.verification_status ?? 'verified';
  const activity = (audit.data?.items ?? []).slice(0, 8);

  return (
    <>
      <Link to="/p/organizations" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Organizations
      </Link>
      <PageHeader
        eyebrow={
          <>
            <Badge size="sm" dot tone={o.status === 'active' ? 'success' : o.status === 'suspended' ? 'danger' : 'neutral'}>
              {o.status}
            </Badge>
            <Badge size="sm" tone={vs === 'verified' ? 'success' : vs === 'rejected' ? 'danger' : 'warning'}>
              {vs === 'verified' ? 'Verified' : vs === 'rejected' ? 'Verification rejected' : 'Awaiting verification'}
            </Badge>
            <Badge size="sm">{d.billing?.plan_name ?? o.subscription_plan ?? 'Free'} plan</Badge>
          </>
        }
        title={o.name}
        description={`Joined ${formatDate(o.created_at)}${d.stats?.last_activity ? ` · last staff sign-in ${formatRelative(d.stats.last_activity)}` : ''}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/p/messages">
                <MessageSquare /> Message
              </Link>
            </Button>
            <Button variant="secondary" onClick={() => setManaging(true)}>
              <Settings2 /> Status & plan
            </Button>
          </>
        }
      />

      {vs !== 'verified' && (
        <Card className="mb-6 p-5 [box-shadow:inset_0_0_0_1.5px_var(--warning)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="type-title text-base text-text">Review this organization</h2>
              <p className="mt-1 text-sm text-muted">Check the documents below against the name, country and phone. Volunteers can’t see its events until you verify it.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger-soft" onClick={() => setRejecting(true)}>
                <ShieldX /> Reject
              </Button>
              <Button
                variant="success"
                loading={review.isPending}
                onClick={() => review.mutate({ id: o.id, status: 'verified' }, { onSuccess: () => notify.success(`${o.name} verified`), onError: (e) => notify.error(errorMessage(e)) })}
              >
                <BadgeCheck /> Verify
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { l: 'Members', v: d.user_count },
              { l: 'Events', v: d.event_count },
              { l: 'Volunteers', v: d.stats?.volunteers ?? 0 },
              { l: 'Verified hours', v: d.stats?.verified_hours ?? 0 },
            ].map((k) => (
              <Card key={k.l} className="p-4">
                <div className="type-eyebrow-sm">{k.l}</div>
                <div className="type-display mt-2 text-3xl text-text">{formatNumber(k.v)}</div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title="Verification documents" />
            <CardBody>
              {(d.documents ?? []).length === 0 ? (
                <p className="text-sm text-muted">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {d.documents!.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm">
                      <FileText className="size-4 shrink-0 text-faint" />
                      <a href={doc.file_url ?? '#'} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-text hover:text-accent-text">
                        {doc.title}
                      </a>
                      <span className="hidden text-xs text-faint sm:inline">
                        {doc.document_type.replace(/_/g, ' ')} · {formatBytes(doc.file_size_bytes)}
                      </span>
                      <Badge size="sm" tone={doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                        {doc.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {d.billing && (
            <Card>
              <CardHeader title="Plan usage" description={o.plan_expires_at ? `Paid until ${formatDate(o.plan_expires_at, 'd MMM yyyy')}` : undefined} />
              <CardBody className="grid gap-2 sm:grid-cols-2">
                {Object.entries(d.billing.limits).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-muted">{LIMIT_LABELS[k] ?? k}</span>
                    <span className="type-data text-text">
                      {v.used} / {v.limit ?? '∞'}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {(d.reports ?? []).length > 0 && (
            <Card>
              <CardHeader title="Reports from volunteers" action={<Link to="/p/reports" className="text-[13px] font-medium text-accent-text hover:underline">All reports</Link>} />
              <CardBody>
                <ul className="divide-y divide-line">
                  {d.reports!.map((r) => (
                    <li key={r.id} className="py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Flag className="size-3.5 text-danger-text" />
                        <span className="font-medium text-text">{REPORT_CATEGORY_LABEL[r.category]}</span>
                        <Badge size="sm" className="ml-auto">
                          {r.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted">{r.details}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Recent activity" action={<Link to="/p/audit" className="text-[13px] font-medium text-accent-text hover:underline">Audit trail</Link>} />
            <ul className="mt-2 divide-y divide-line px-5 pb-3">
              {activity.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="truncate text-text">
                    {l.actor?.name ? `${l.actor.name}: ` : ''}
                    {l.action_label ?? actionLabel(l.action)}
                  </span>
                  <span className="shrink-0 text-[12px] text-faint">{formatRelative(l.created_at)}</span>
                </li>
              ))}
              {activity.length === 0 && <li className="py-6 text-center text-sm text-muted">No recorded activity yet.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <dl>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Mail className="size-3.5" />Email</span>}>{o.email}</KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Phone className="size-3.5" />Phone</span>}>{o.phone ? formatPhone(o.phone) : '—'}</KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><MapPin className="size-3.5" />Location</span>}>
                  {[o.city, countryName(o.country)].filter(Boolean).join(', ') || o.address || '—'}
                </KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Globe className="size-3.5" />Website</span>}>
                  {o.website ? (
                    <a href={o.website} target="_blank" rel="noreferrer" className="text-accent-text hover:underline">
                      {o.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    '—'
                  )}
                </KeyValue>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Organization admins" />
            <CardBody className="space-y-3">
              {(d.admins ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Avatar name={a.full_name} src={a.profile_photo_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{a.full_name}</div>
                    <div className="truncate text-[12px] text-faint">{a.email}</div>
                  </div>
                  {a.must_change_password ? (
                    <Button
                      size="xs"
                      variant="secondary"
                      loading={resend.isPending && resend.variables === a.id}
                      onClick={() => resend.mutate(a.id, { onSuccess: (r) => notify.success(r.message ?? 'Invitation sent'), onError: (e) => notify.error(errorMessage(e)) })}
                    >
                      <Send /> Resend invite
                    </Button>
                  ) : (
                    a.is_active === false && (
                      <Badge size="sm" tone="danger">
                        Inactive
                      </Badge>
                    )
                  )}
                </div>
              ))}
              {(d.admins ?? []).length === 0 && <p className="text-sm text-muted">No admins found.</p>}
            </CardBody>
          </Card>
          {(d.payments ?? []).length > 0 && (
            <Card>
              <CardHeader title="Payments" action={<Link to="/p/payments" className="text-[13px] font-medium text-accent-text hover:underline">All</Link>} />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {d.payments!.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="type-data text-text">
                        {formatNumber(p.amount)} {p.currency}
                      </span>
                      <span className="text-xs text-faint">{formatDate(p.created_at, 'd MMM')}</span>
                      <Badge size="sm" tone={p.status === 'verified' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>
                        {p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      <OrgStatusDialog org={managing ? o : null} onClose={() => setManaging(false)} />
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent title={`Reject ${o.name}?`} description="The admins see your reason and can upload new documents." size="sm">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. The registration certificate is expired" aria-label="Reason" />
          <DialogActions>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={notes.trim().length < 3}
              loading={review.isPending}
              onClick={() => review.mutate({ id: o.id, status: 'rejected', notes: notes.trim() }, { onSuccess: () => (notify.success('Verification rejected'), setRejecting(false)) })}
            >
              Reject
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
