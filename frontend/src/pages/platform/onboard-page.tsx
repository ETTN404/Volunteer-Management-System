import { ArrowLeft, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, InlineAlert, KeyValue, PageHeader, notify } from '@/shared/ui';
import { useOnboardTenant } from '@/features/platform/api';
import { OrgOnboardForm } from '@/features/platform/org-onboard-form';

export default function OnboardPage() {
  const onboard = useOnboardTenant();
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = 'Onboard an organization · VolunTrack';
  }, []);

  if (onboard.isSuccess) {
    const { organization, admin } = onboard.data;
    const details = `VolunTrack sign-in\n${window.location.origin}/login\nEmail: ${admin.email}\nPassword: ${password}`;
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
          <KeyValue label="Password">
            <span className="font-mono font-semibold">{password}</span>
          </KeyValue>
          <KeyValue label="Plan">{organization.subscription_plan ?? 'free'}</KeyValue>
        </Card>
        <InlineAlert tone="success" icon={<ShieldCheck />} className="mt-4" title={`${admin.first_name ?? admin.full_name} can sign in now`}>
          Share the sign-in details with them privately. They can change the password from Account settings.
        </InlineAlert>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(details);
              notify.success('Sign-in details copied');
            }}
          >
            <Copy /> Copy sign-in details
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
          onSubmit={(v) => {
            setPassword(v.admin_password);
            return onboard.mutateAsync({
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
              admin_password: v.admin_password,
              admin_password_confirmation: v.admin_password_confirmation,
              documents: v.documents,
            });
          }}
        />
      </div>
    </>
  );
}
