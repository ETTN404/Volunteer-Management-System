import { ArrowLeft, CheckCircle2, Copy, MailCheck, MailWarning } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button, Card, InlineAlert, KeyValue, PageHeader, notify } from '@/shared/ui';
import { useOnboardTenant } from '@/features/platform/api';
import { OrgOnboardForm } from '@/features/platform/org-onboard-form';

export default function OnboardPage() {
  const onboard = useOnboardTenant();

  useEffect(() => {
    document.title = 'Onboard an organization · VolunTrack';
  }, []);

  if (onboard.isSuccess) {
    const { organization, admin, invitation } = onboard.data;
    return (
      <div className="mx-auto max-w-xl py-6">
        <div className="mb-6 grid size-14 place-items-center rounded-full bg-success-soft text-success-text">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="type-headline text-3xl text-text">{organization.name} is on VolunTrack</h1>
        <p className="mt-2 text-muted">Free to start, verified, and visible to volunteers as soon as they publish events.</p>
        <Card className="mt-6 space-y-3 p-5">
          <KeyValue label="Admin">{admin.full_name}</KeyValue>
          <KeyValue label="Email">{admin.email}</KeyValue>
          <KeyValue label="Plan">{organization.subscription_plan ?? 'free'}</KeyValue>
        </Card>
        {invitation.email_sent ? (
          <InlineAlert tone="success" icon={<MailCheck />} className="mt-4" title="Invitation emailed">
            {admin.first_name ?? admin.full_name} received a temporary password and a one-time link (valid until {new Date(invitation.expires_at).toLocaleString()}). They choose their own password on first sign-in.
          </InlineAlert>
        ) : (
          <InlineAlert tone="warning" icon={<MailWarning />} className="mt-4" title="The email could not be sent">
            Mail delivery isn’t configured on the server yet. Share this one-time link with the admin yourself.
          </InlineAlert>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(invitation.invite_url);
              notify.success('Invitation link copied');
            }}
          >
            <Copy /> Copy invitation link
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/p/organizations/${organization.id}`}>Open organization</Link>
          </Button>
          <Button onClick={() => onboard.reset()}>Onboard another</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link to="/p/organizations" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Organizations
      </Link>
      <PageHeader eyebrow="Onboard" title="Onboard an organization" description="Organizations can also sign up themselves from the public sign-up page — those wait for your document review." />
      <div className="mx-auto max-w-3xl">
        <OrgOnboardForm
          mode="platform"
          submitting={onboard.isPending}
          error={onboard.error}
          onSubmit={(v) =>
            onboard.mutateAsync({
              org_name: v.org_name,
              org_email: v.org_email,
              org_country: v.org_country,
              org_city: v.org_city,
              org_address: v.org_address || null,
              org_phone: v.org_phone,
              org_website: v.org_website || null,
              plan: v.plan,
              admin_first_name: v.admin_first_name,
              admin_last_name: v.admin_last_name,
              admin_email: v.admin_email,
              admin_phone: v.admin_phone || null,
              documents: v.documents,
            })
          }
        />
      </div>
    </>
  );
}
