import { ArrowLeft, Award, BadgeCheck, Clock4, ShieldQuestion, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/time';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { CERTIFICATE_MILESTONES, normalizeAvailability, AVAILABILITY_SLOTS } from '@/shared/lib/skills';
import type { SkillVerificationStatus } from '@/shared/types/api';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, ErrorState, Menu, MenuContent, MenuItem, MenuTrigger, PageHeader, ProgressBar, Select, Skeleton, notify } from '@/shared/ui';
import { SkillRadar } from '@/shared/ui/charts';
import { useIssueCertificate, useVerifySkill, useVolunteerDetail } from '@/features/people/api';
import { useOrgVolunteer } from '@/features/organization/api';
import { useDocumentQueue } from '@/features/documents/api';
import { useSession } from '@/features/auth/use-session';

const VERIFY: Record<SkillVerificationStatus, { icon: typeof BadgeCheck; label: string; cls: string }> = {
  verified: { icon: BadgeCheck, label: 'Verified', cls: 'text-success-text' },
  pending: { icon: Clock4, label: 'Pending', cls: 'text-warning-text' },
  rejected: { icon: XCircle, label: 'Rejected', cls: 'text-danger-text' },
  unverified: { icon: ShieldQuestion, label: 'Unverified', cls: 'text-faint' },
};

export default function VolunteerDetailPage() {
  const id = Number(useParams().volunteerId);
  const inOrg = useLocation().pathname.startsWith('/o');
  const { role } = useSession();
  // OrgAdmins use /admin/volunteers/{id}; coordinators /coordinator/volunteers/{id}. Same payload.
  const coord = useVolunteerDetail(inOrg ? NaN : id);
  const admin = useOrgVolunteer(inOrg ? id : NaN);
  const detail = inOrg ? admin : coord;
  const verify = useVerifySkill();
  const issue = useIssueCertificate();
  const docs = useDocumentQueue();
  const [milestone, setMilestone] = useState<string>('');

  useEffect(() => {
    if (detail.data) document.title = `${detail.data.volunteer.user?.full_name} · VolunTrack`;
  }, [detail.data]);

  if (detail.isLoading) return <Skeleton className="h-[560px] rounded-xl" />;
  if (detail.error || !detail.data) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const { volunteer: v, reliability: r, skills_alignment } = detail.data;
  const myDocs = (docs.data ?? []).filter((d) => d.volunteer_id === v.id);
  const eligible = CERTIFICATE_MILESTONES.filter((m) => m <= v.total_hours);
  const canManage = role === 'Coordinator' || role === 'OrgAdmin';

  return (
    <>
      <Link to={inOrg ? '/o/members' : '/c/volunteers'} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Volunteers
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar name={v.user?.full_name ?? ''} src={v.user?.profile_photo_url} size="lg" />
            {v.user?.full_name}
          </span>
        }
        description={`${v.user?.email} · joined ${formatDate(v.created_at, 'MMMM yyyy')}`}
        actions={
          v.is_minor ? (
            <Badge tone={v.parental_consent_verified ? 'success' : 'warning'}>{v.parental_consent_verified ? 'Under 18 · consent verified' : 'Under 18 · consent missing'}</Badge>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ['Hours logged', formatHours(v.total_hours)],
              ['Impact score', v.impact_score.toFixed(1)],
              ['Attendance', `${r.attendance_rate}%`],
              ['On time', `${r.on_time_rate}%`],
            ].map(([l, val]) => (
              <Card key={l} className="p-4">
                <div className="type-eyebrow-sm">{l}</div>
                <div className="type-data mt-1.5 text-2xl text-text">{val}</div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title="Skills" description="Verify skills against the volunteer’s documents (BR-03)." />
            <CardBody>
              <ul className="divide-y divide-line">
                {v.skills.map((s) => {
                  const st = (v.skills_verification ?? {})[s] ?? 'unverified';
                  const meta = VERIFY[st];
                  return (
                    <li key={s} className="flex items-center gap-3 py-3">
                      <span className="flex-1 text-[14px] font-medium text-text">{humanizeSkill(s)}</span>
                      <span className={cn('inline-flex items-center gap-1.5 text-[12.5px]', meta.cls)}>
                        <meta.icon className="size-3.5" /> {meta.label}
                      </span>
                      {canManage && (
                        <Menu>
                          <MenuTrigger asChild>
                            <Button size="xs" variant="ghost">
                              Change
                            </Button>
                          </MenuTrigger>
                          <MenuContent>
                            {(['verified', 'rejected', 'pending', 'unverified'] as const).map((k) => (
                              <MenuItem
                                key={k}
                                onSelect={() => verify.mutate({ volunteerId: v.id, skill: s, status: k }, { onSuccess: () => notify.success(`${humanizeSkill(s)} marked ${VERIFY[k].label.toLowerCase()}`), onError: (e) => notify.error(e) })}
                              >
                                {VERIFY[k].label}
                              </MenuItem>
                            ))}
                          </MenuContent>
                        </Menu>
                      )}
                    </li>
                  );
                })}
                {v.skills.length === 0 && <li className="py-4 text-sm text-muted">No skills listed.</li>}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documents" />
            <CardBody>
              {myDocs.length === 0 ? (
                <p className="text-sm text-muted">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {myDocs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="truncate text-[14px] font-medium text-text hover:text-accent-text">
                        {d.title}
                      </a>
                      <Badge size="sm" tone={d.verification_status === 'verified' ? 'success' : d.verification_status === 'rejected' ? 'danger' : 'warning'}>
                        {d.verification_status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="link" size="sm" className="mt-3">
                <Link to="/c/documents">Open document review</Link>
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Strengths" />
            <CardBody>
              <SkillRadar data={Object.entries(skills_alignment).map(([axis, value]) => ({ axis: humanizeSkill(axis), value }))} height={220} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Reliability" />
            <CardBody className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">Attendance</span>
                  <span className="type-data text-text">{r.attendance_rate}%</span>
                </div>
                <ProgressBar value={r.attendance_rate} tone="success" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">On time</span>
                  <span className="type-data text-text">{r.on_time_rate}%</span>
                </div>
                <ProgressBar value={r.on_time_rate} />
              </div>
              <p className="text-[12.5px] text-faint">
                {r.total_attended_shifts ?? 0} of {r.total_confirmed_shifts} confirmed shifts attended
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Availability" />
            <CardBody className="flex flex-wrap gap-1.5">
              {normalizeAvailability(v.availability).map((a) => (
                <span key={a} className="rounded-md bg-surface-2 px-2.5 py-1 text-[12.5px] text-muted">
                  {AVAILABILITY_SLOTS.find((s) => s.key === a)?.label ?? humanizeSkill(a)}
                </span>
              ))}
              {normalizeAvailability(v.availability).length === 0 && <span className="text-sm text-muted">Not set</span>}
            </CardBody>
          </Card>
          {canManage && (
            <Card>
              <CardHeader title="Issue a certificate" description="Milestones are issued automatically at check-out; use this to re-issue." />
              <CardBody className="flex gap-2">
                <div className="flex-1">
                  <Select aria-label="Milestone" value={milestone} onValueChange={setMilestone} placeholder={eligible.length ? 'Milestone' : 'None reached yet'} disabled={!eligible.length} options={eligible.map((m) => ({ value: String(m), label: `${m} hours` }))} />
                </div>
                <Button
                  disabled={!milestone}
                  loading={issue.isPending}
                  onClick={() =>
                    issue.mutate({ volunteerId: v.id, milestone: Number(milestone) }, { onSuccess: () => notify.success('Certificate issued', `${milestone}-hour certificate for ${v.user?.full_name}`), onError: (e) => notify.error(e) })
                  }
                >
                  <Award /> Issue
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
