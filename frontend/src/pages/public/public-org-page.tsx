import { motion } from 'motion/react';
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Clock, Copy, Globe, MapPin, Share2, Users } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { formatDate, formatDay, formatTime } from '@/shared/lib/time';
import { formatNumber } from '@/shared/lib/format';
import { Button, Card, EmptyState, ErrorState, Logo, Skeleton, countryName, notify } from '@/shared/ui';
import { EASE_OUT_EXPO, Stagger, StaggerItem } from '@/shared/motion';
import { usePublicOrganization } from '@/features/public/api';
import { useSession } from '@/features/auth/use-session';
import { useT } from '@/shared/i18n';
import { LanguageToggle } from '@/app/layouts/language-toggle';
import { applyBrand, isHex } from '@/shared/lib/color';

/** Shareable organization page — works without an account (link it from Telegram, posters, a website). */
export default function PublicOrgPage() {
  const orgId = Number(useParams().orgId);
  const org = usePublicOrganization(orgId);
  const { role } = useSession();
  const t = useT();
  const o = org.data;
  const [params] = useSearchParams();
  // Brand studio preview passes an unsaved colour; otherwise use the organization's own.
  const previewColor = params.get('preview_color');
  const brand = isHex(previewColor) ? previewColor : o?.primary_color;
  useEffect(() => {
    applyBrand(brand, 'light');
    return () => applyBrand(null, 'light');
  }, [brand]);

  useEffect(() => {
    document.title = o ? `${o.name} · VolunTrack` : 'VolunTrack';
  }, [o]);

  const eventHref = (id: number) => (role === 'Volunteer' ? `/v/opportunities/${id}` : '/register');

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: o?.name, url });
      else {
        await navigator.clipboard.writeText(url);
        notify.success(t('Link copied'));
      }
    } catch {
      /* user closed the share sheet */
    }
  };

  return (
    <div className="bg-contours min-h-dvh bg-bg">
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link to="/" aria-label={t('VolunTrack home')}>
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle className="hidden sm:flex" />
          {role ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/app">{t('Open the app')}</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">{t('Sign in')}</Link>
            </Button>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 pb-24 pt-4 sm:px-8">
        {org.isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : org.error || !o ? (
          <ErrorState error={org.error} title={t('This organization isn’t available')} />
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
              className="relative overflow-hidden rounded-3xl bg-surface p-6 [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)] sm:p-10"
            >
              <div className="absolute inset-x-0 top-0 h-2" style={{ background: brand ?? 'var(--accent)' }} />
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div
                  className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-faint ring-1 ring-line"
                  style={brand && !o.logo_url ? { background: brand, color: '#fff' } : undefined}
                >
                  {o.logo_url ? <img src={o.logo_url} alt="" className="size-full object-cover" /> : <Building2 className="size-8" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="type-headline text-[clamp(1.7rem,5vw,2.6rem)] break-words text-text">{o.name}</h1>
                    {o.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
                        <BadgeCheck className="size-3.5" /> {t('Verified organization')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                    {(o.city || o.country) && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4 text-faint" /> {[o.city, countryName(o.country)].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {o.website && (
                      <a href={o.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-text">
                        <Globe className="size-4 text-faint" /> {o.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-faint" /> {t('On VolunTrack since {date}', { date: formatDate(o.member_since, 'MMMM yyyy') })}
                    </span>
                  </div>
                  {o.about && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-text wrap-anywhere">{o.about}</p>}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {role !== 'Volunteer' && (
                      <Button asChild size="lg">
                        <Link to="/register">
                          {t('Volunteer with us')} <ArrowRight />
                        </Link>
                      </Button>
                    )}
                    <Button variant="secondary" size="lg" onClick={share}>
                      {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 /> : <Copy />} {t('Share this page')}
                    </Button>
                  </div>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['Open events', o.stats.active_events],
                    ['Past events', o.stats.past_events],
                    ['Volunteers', o.stats.volunteers],
                    ['Verified hours', o.stats.verified_hours],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-surface-2 p-4">
                    <dt className="type-eyebrow-sm">{t(label)}</dt>
                    <dd className="type-data mt-1.5 text-2xl text-text">{formatNumber(value)}</dd>
                  </div>
                ))}
              </dl>
            </motion.section>

            <section aria-labelledby="events-title" className="mt-10">
              <h2 id="events-title" className="type-title text-xl text-text">
                {t('Upcoming events')}
              </h2>
              <p className="mt-1 text-sm text-muted">{t('Sign up free, then apply for a shift. A coordinator confirms your place.')}</p>
              {o.upcoming_events.length === 0 ? (
                <EmptyState className="mt-5" icon={<CalendarDays />} title={t('No open events right now')} description={t('New events appear here as soon as they are posted.')} />
              ) : (
                <Stagger className="mt-5 grid gap-4 sm:grid-cols-2">
                  {o.upcoming_events.map((e) => (
                    <StaggerItem key={e.id}>
                      <Card interactive className="relative flex h-full flex-col p-5">
                        <Link to={eventHref(e.id)} className="absolute inset-0 z-10 rounded-lg" aria-label={t('Open {title}', { title: e.title })} />
                        <h3 className="type-title text-[17px] text-text wrap-anywhere">{e.title}</h3>
                        {e.description && <p className="mt-2 line-clamp-2 text-[13.5px] text-muted wrap-anywhere">{e.description}</p>}
                        <div className="mt-4 space-y-1.5 text-[13px] text-muted">
                          {e.next_shift && (
                            <div className="flex items-center gap-2">
                              <Clock className="size-3.5 shrink-0 text-faint" />
                              {t('Next shift: {when}', { when: `${formatDay(e.next_shift)} ${formatTime(e.next_shift)}` })}
                            </div>
                          )}
                          <div className="flex min-w-0 items-center gap-2">
                            <MapPin className="size-3.5 shrink-0 text-faint" /> <span className="truncate">{e.location}</span>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-5 text-[12.5px]">
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <Users className="size-3.5 text-faint" /> {e.open_places > 0 ? t('{n} open', { n: e.open_places }) : t('Full — waitlist open')}
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-accent-text">
                            {role === 'Volunteer' ? t('See shifts') : t('Sign up to apply')} <ArrowRight className="size-3.5" />
                          </span>
                        </div>
                      </Card>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
