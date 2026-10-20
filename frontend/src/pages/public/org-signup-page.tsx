import { BadgeCheck, Building2, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button, Card, InlineAlert, Logo } from '@/shared/ui';
import { useOrganizationSignup, usePublicPlans } from '@/features/public/api';
import { OrgOnboardForm } from '@/features/platform/org-onboard-form';
import { formatNumber } from '@/shared/lib/format';

/** Public self sign-up for organizations: Free plan, verified by the platform team from uploaded documents. */
export default function OrgSignupPage() {
  const signup = useOrganizationSignup();
  const plans = usePublicPlans();

  useEffect(() => {
    document.title = 'Register your organization · VolunTrack';
  }, []);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" aria-label="VolunTrack home">
          <Logo />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <p className="type-eyebrow mb-3">For organizations</p>
            <h1 className="type-headline text-[clamp(2rem,5vw,2.8rem)] text-text">
              Run your volunteers on <span className="text-sunrise">VolunTrack</span>
            </h1>
            <p className="mt-3 text-[15px] text-muted">Shifts, verified check-in, hours and certificates — free to start, no card needed.</p>
          </div>
          <ul className="space-y-3 text-sm text-text">
            {[
              { icon: Sparkles, t: 'Start on the Free plan right away' },
              { icon: ShieldCheck, t: 'We verify your documents so volunteers can trust you' },
              { icon: BadgeCheck, t: 'Verified badge on every event you post' },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent-text">
                  <Icon className="size-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          {plans.data && (
            <div className="grid gap-2">
              {plans.data.map((p) => (
                <Card key={p.key} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold text-text">{p.name}</div>
                    <div className="text-xs text-muted">
                      {p.limits.coordinators == null ? 'Unlimited coordinators' : `${p.limits.coordinators} coordinators`} ·{' '}
                      {p.limits.active_events == null ? 'unlimited events' : `${p.limits.active_events} active events`}
                    </div>
                  </div>
                  <div className="type-data text-sm text-text">{p.price_monthly ? `${formatNumber(p.price_monthly)} ETB/mo` : 'Free'}</div>
                </Card>
              ))}
            </div>
          )}
        </aside>

        <section>
          {signup.isSuccess ? (
            <Card className="p-8 text-center">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-success-soft text-success-text">
                <MailCheck className="size-7" />
              </div>
              <h2 className="type-headline text-2xl text-text">Welcome, {signup.data.organization.name}</h2>
              <p className="mt-3 text-[15px] text-muted">{signup.data.message}</p>
              {!signup.data.email_sent && (
                <InlineAlert tone="warning" className="mt-5 text-left">
                  We couldn’t send the email right now. Use “Invitation expired?” on the sign-in page in a few minutes to get it again.
                </InlineAlert>
              )}
              <Button asChild className="mt-6">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </Card>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-2 text-sm text-muted">
                <Building2 className="size-4" /> Takes about 3 minutes. Have your registration certificate ready (PDF or photo).
              </div>
              <OrgOnboardForm
                mode="public"
                submitting={signup.isPending}
                error={signup.error}
                onSubmit={(v) =>
                  signup.mutateAsync({
                    org_name: v.org_name,
                    org_email: v.org_email,
                    org_country: v.org_country,
                    org_city: v.org_city,
                    org_address: v.org_address || null,
                    org_phone: v.org_phone,
                    org_website: v.org_website || null,
                    admin_first_name: v.admin_first_name,
                    admin_last_name: v.admin_last_name,
                    admin_email: v.admin_email,
                    admin_phone: v.admin_phone || null,
                    documents: v.documents.map((d) => ({ file: d.file, type: d.type as never, title: d.title })),
                    accept_terms: v.accept_terms,
                  })
                }
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
