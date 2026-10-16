import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowRight, Bot, SearchCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/time';
import { Button, Input } from '@/shared/ui';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { useVerifyCertificate } from '@/features/public/api';
import { Reveal } from '@/shared/motion';
import { SectionHead, Shell } from './kit';

function VerifyCard() {
  const [draft, setDraft] = useState('VMS-00001');
  const [query, setQuery] = useState<string>();
  const result = useVerifyCertificate(query);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(draft.trim().toUpperCase());
  };
  return (
    <Reveal inView className="flex flex-col rounded-[28px] bg-surface p-7 [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)] sm:p-9">
      <h3 className="type-title text-[22px] text-text">Check any certificate</h3>
      <p className="mt-1.5 text-[14.5px] text-muted">Employers and universities confirm hours in seconds. No account, no phone calls.</p>
      <form onSubmit={submit} className="mt-6 flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Certificate number" placeholder="VMS-00012" className="font-mono uppercase" leading={<SearchCheck />} inputSize="lg" />
        <Button type="submit" size="lg" loading={result.isFetching}>
          Verify
        </Button>
      </form>
      <div className="mt-6 min-h-[136px] flex-1">
        <AnimatePresence mode="wait">
          {result.data?.valid === true ? (
            <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5 rounded-2xl bg-success-soft p-4">
              <CertificateSeal hours={result.data.data.milestone_hours} size={96} />
              <div className="text-sm">
                <div className="font-semibold text-success-text">Valid certificate</div>
                <div className="mt-1 text-text">
                  {result.data.data.volunteer_name} · {result.data.data.milestone_hours} hours
                </div>
                <div className="text-muted">{result.data.data.organization_name}</div>
                <div className="mt-1 text-xs text-faint">Issued {formatDate(result.data.data.issued_date)}</div>
              </div>
            </motion.div>
          ) : result.data?.valid === false ? (
            <motion.div key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-text">
              No certificate matches <span className="font-mono">{query}</span>. Check the number under the QR code.
            </motion.div>
          ) : result.isError ? (
            <motion.div key="err" className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-text">
              The verification service didn’t answer. Try again in a moment.
            </motion.div>
          ) : (
            <motion.div key="idle" className="rounded-2xl p-4 text-sm text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
              Try the sample number, or enter one from a certificate.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Link to="/verify" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
        Open the verification page <ArrowRight className="size-4" />
      </Link>
    </Reveal>
  );
}

const SCRIPT: { from: 'user' | 'bot'; text: string; am?: boolean }[] = [
  { from: 'user', text: 'When is my next shift?' },
  { from: 'bot', text: 'Meskel Square Blood Drive — Saturday at 08:00. Check in within 150 m of the main tent by scanning your coordinator’s QR code.' },
  { from: 'user', text: 'ሰርተፊኬት ለማግኘት ስንት ሰዓት ይቀረኛል?', am: true },
  { from: 'bot', text: 'እስካሁን 46.5 የተረጋገጡ ሰዓቶች አሉዎት። የ50-ሰዓት ሰርተፊኬት ለማግኘት 3.5 ሰዓት ብቻ ይቀርዎታል። በርቱ!', am: true },
];

function BotCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? SCRIPT.length : 0);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!inView || reduce || shown >= SCRIPT.length) return;
    if (SCRIPT[shown]!.from === 'bot') {
      setTyping(true);
      const t = setTimeout(() => {
        setTyping(false);
        setShown((s) => s + 1);
      }, 1400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown ? 1000 : 300);
    return () => clearTimeout(t);
  }, [inView, shown, reduce]);

  return (
    <Reveal inView delay={0.1} className="flex flex-col rounded-[28px] bg-[#0b1f1a] p-7 text-white [box-shadow:var(--elev-3)] sm:p-9">
      <div ref={ref} className="flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="grid size-10 place-items-center rounded-2xl bg-gold text-[#0b1f1a]">
          <Bot className="size-5" />
        </span>
        <div>
          <div className="font-semibold">VolunBot</div>
          <div className="text-[12.5px] text-white/65">Knows each volunteer’s schedule and hours</div>
        </div>
      </div>
      <div className="flex min-h-[300px] flex-1 flex-col gap-3 pt-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {SCRIPT.slice(0, shown).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              lang={m.am ? 'am' : undefined}
              className={cn('max-w-[86%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed', m.am && 'font-ethiopic', m.from === 'user' ? 'self-end rounded-br-md bg-[#5fd3a4] text-[#03140d]' : 'self-start rounded-bl-md bg-white/[0.07] text-white/90')}
            >
              {m.text}
            </motion.div>
          ))}
          {typing && (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 self-start rounded-2xl rounded-bl-md bg-white/[0.07] px-4 py-3.5" aria-label="VolunBot is typing">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="size-1.5 rounded-full bg-white/60" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export function Proof() {
  return (
    <Shell id="volunbot">
      <SectionHead
        className="max-w-[980px]"
        eyebrow="Proof and help, built in"
        title={
          <>
            Records anyone can trust.
            <br />
            <span className="text-sunrise">Answers in their language.</span>
          </>
        }
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <VerifyCard />
        <BotCard />
      </div>
    </Shell>
  );
}
