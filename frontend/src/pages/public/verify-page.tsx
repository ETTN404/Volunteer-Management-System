import { motion } from 'motion/react';
import { BadgeCheck, Building2, CalendarCheck, SearchCheck, ShieldX } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ErrorState, Input, Logo, Skeleton } from '@/shared/ui';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { useVerifyCertificate } from '@/features/public/api';
import { formatDate } from '@/shared/lib/time';
import { EASE_OUT_EXPO } from '@/shared/motion';

export default function VerifyPage() {
  const { number } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(number ?? '');
  const q = useVerifyCertificate(number);

  useEffect(() => {
    document.title = number ? `Verify ${number} · VolunTrack` : 'Verify a certificate · VolunTrack';
    setDraft(number ?? '');
  }, [number]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) navigate(`/verify/${encodeURIComponent(draft.trim().toUpperCase())}`);
  };

  return (
    <div className="bg-contours min-h-dvh bg-bg">
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="VolunTrack home">
          <Logo />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        <p className="type-eyebrow mb-4 text-center">Public verification</p>
        <h1 className="type-headline text-center text-[clamp(2rem,6vw,3.2rem)] text-text">Verify a volunteer certificate</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-muted">Enter the number printed under the certificate’s QR code. No account needed.</p>

        <form onSubmit={submit} className="mx-auto mt-9 flex max-w-md gap-2">
          <Input inputSize="lg" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="VMS-00012" aria-label="Certificate number" className="type-code uppercase" leading={<SearchCheck />} />
          <Button type="submit" size="lg">
            Verify
          </Button>
        </form>

        <div className="mt-12">
          {q.isLoading && <Skeleton className="h-80 rounded-3xl" />}
          {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
          {q.data?.valid === false && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-surface p-10 text-center [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-danger-soft text-danger-text">
                <ShieldX className="size-6" />
              </div>
              <h2 className="type-title text-xl text-text">No certificate matches {number}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Check each character — numbers look like VMS-00012. If it still fails, the certificate may have been revoked.</p>
            </motion.div>
          )}
          {q.data?.valid === true && (
            <motion.article
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="relative overflow-hidden rounded-3xl bg-surface [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)]"
            >
              <div className="flex items-center gap-2 bg-success-soft px-6 py-3 text-sm font-semibold text-success-text">
                <BadgeCheck className="size-4" /> Valid certificate · checked {formatDate(q.data.data.verified_at, 'd MMM yyyy, HH:mm')}
              </div>
              <div className="flex flex-col items-center gap-8 p-8 sm:flex-row sm:p-10">
                <motion.div initial={{ rotate: -25, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.2 }}>
                  <CertificateSeal hours={q.data.data.milestone_hours} size={150} />
                </motion.div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="type-eyebrow">Certificate of service</p>
                  <h2 className="type-headline mt-2 text-3xl text-text">{q.data.data.volunteer_name}</h2>
                  <p className="mt-2 text-[15px] text-muted">completed {q.data.data.milestone_hours} verified volunteer hours.</p>
                  <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                    <li className="flex items-center gap-2.5 text-text">
                      <Building2 className="size-4 text-faint" />
                      {q.data.data.organization_name}
                    </li>
                    <li className="flex items-center gap-2.5 text-text">
                      <CalendarCheck className="size-4 text-faint" />
                      Issued {formatDate(q.data.data.issued_date)}
                    </li>
                  </ul>
                  <p className="type-code mt-6 text-xs text-faint">{q.data.data.certificate_number}</p>
                </div>
              </div>
              <p className="border-t border-line px-8 py-4 text-xs text-faint">The surname is shortened to protect the volunteer’s privacy.</p>
            </motion.article>
          )}
        </div>
      </main>
    </div>
  );
}
