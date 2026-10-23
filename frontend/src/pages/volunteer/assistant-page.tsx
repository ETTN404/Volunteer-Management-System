import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUp,
  History,
  Award,
  CalendarClock,
  Check,
  Copy,
  Crosshair,
  Languages,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  SquarePen,
  UserCheck,
  Zap,
} from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { countdownTo, formatDay, formatTime, greeting, parseApiDate } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { firstName, humanizeSkill } from '@/shared/lib/format';
import { normalizeAvailability } from '@/shared/lib/skills';
import { useLocaleStore, useT } from '@/shared/i18n';
import { Avatar, Button, Menu, MenuContent, MenuItem, MenuTrigger } from '@/shared/ui';
import { ContextPanel } from '@/features/chat/components/context-panel';
import { useSession } from '@/features/auth/use-session';
import { chatKeys, useChatHistory, useSendChat, type ChatMessage, type ChatSend } from '@/features/chat/api';
import { ThreadsSheet } from '@/features/chat/components/threads-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { BotOrb, ETHIOPIC, RichText, ShiftCard, Thinking } from '@/features/chat/components/parts';
import { LocationRequest, MapPickerDialog, useOneShotLocation, type SharedLocation } from '@/features/chat/components/location-request';
import { useImpact, useSchedule, useVolunteerProfile } from '@/features/volunteer/api';

const desktopQuery = '(min-width: 1024px)';
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(desktopQuery);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
}

type Recognition = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
const SpeechCtor = typeof window !== 'undefined' ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined : undefined;

/** Calls the latest version of a callback through a stable function (keeps memoised children still). */
function useStable<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/**
 * Fits the chat exactly into the visible screen: on phones it follows the visual
 * viewport (browser bars, on-screen keyboard); on desktop it fills the content panel
 * below any banners — so the composer is never pushed off the bottom.
 */
function useFitHeight(desktop: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vv = window.visualViewport;
    const fit = () => {
      if (desktop) {
        const top = el.getBoundingClientRect().top + (el.closest('main')?.scrollTop ?? 0);
        el.style.height = `${Math.max(480, Math.floor(window.innerHeight - top - 12))}px`;
      } else {
        el.style.height = `${Math.floor(vv?.height ?? window.innerHeight)}px`;
        el.style.transform = vv && vv.offsetTop ? `translateY(${vv.offsetTop}px)` : '';
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    const main = el.closest('main');
    if (desktop && main?.firstElementChild) ro.observe(main.firstElementChild);
    window.addEventListener('resize', fit);
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
    };
  }, [desktop]);
  return ref;
}

export default function AssistantPage() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const { user } = useSession();
  const qc = useQueryClient();
  // The open conversation lives in the URL (?c=…), so back/forward and reloads keep it.
  const [params, setParams] = useSearchParams();
  const thread = params.get('c') ?? 'latest';
  const openThread = useCallback((id: string, replace = false) => setParams({ c: id }, { replace }), [setParams]);
  const history = useChatHistory(thread);
  const send = useSendChat(thread, (id) => openThread(id, true));
  const [historyOpen, setHistoryOpen] = useState(false);
  const schedule = useSchedule();
  const impact = useImpact();
  const profile = useVolunteerProfile();

  const [pending, setPending] = useState<SharedLocation | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const lastInput = useRef<ChatSend | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useFitHeight(desktop);

  const messages = useMemo(() => history.data?.messages ?? [], [history.data]);
  const serverLocation = history.data?.location ?? null;
  const hasLocation = Boolean(pending || serverLocation);
  const degraded = Boolean([...messages].reverse().find((m) => m.role === 'model')?.degraded);

  useEffect(() => {
    document.title = 'VolunBot · VolunTrack';
  }, []);

  const latestId = thread === 'latest' ? history.data?.threadId : null;
  useEffect(() => {
    if (!latestId || !history.data) return;
    qc.setQueryData(chatKeys.history(latestId), history.data);
    openThread(latestId, true);
  }, [latestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full-screen on phones: keep the page behind from scrolling.
  useEffect(() => {
    if (desktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [desktop]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const id = requestAnimationFrame(() => el.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' }));
    return () => cancelAnimationFrame(id);
  }, [messages.length, send.isPending]);

  const ask = useStable((text: string, loc: SharedLocation | null = pending) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    const input: ChatSend = { message };
    const id = history.data?.threadId ?? (thread !== 'latest' && thread !== 'new' ? thread : null);
    if (id) input.thread_id = id;
    if (loc) {
      input.latitude = loc.latitude;
      input.longitude = loc.longitude;
      input.location_source = loc.source;
      if (loc.label) input.location_label = loc.label;
    }
    lastInput.current = input;
    send.mutate(input, { onSuccess: () => setPending(null) });
  });
  const askText = useStable((text: string) => ask(text));

  // Location shared from a "where are you?" card → answer the last question again with it.
  const shareAndRetry = useStable((loc: SharedLocation) => {
    const lastQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content;
    setPending(loc);
    ask(lastQuestion ? lastQuestion : t('Which open shifts are closest to me?'), loc);
  });
  const quickGps = useOneShotLocation((loc) => setPending(loc));
  const onLocationButton = useStable(() => (hasLocation ? setMapOpen(true) : quickGps.request()));

  const forgetLocation = () => {
    setPending(null);
    const id = history.data?.threadId;
    send.mutate({ message: t('Please forget my location.'), forget_location: true, ...(id ? { thread_id: id } : {}) });
  };

  // ---- personalised starters ------------------------------------------------
  const next = useMemo(() => {
    const now = Date.now();
    return (schedule.data ?? [])
      .filter((a) => ['confirmed', 'pending', 'waitlisted'].includes(a.status) && a.shift && (parseApiDate(a.shift.end_time)?.getTime() ?? 0) > now)
      .sort((a, b) => a.shift!.start_time.localeCompare(b.shift!.start_time))[0];
  }, [schedule.data]);
  const v = profile.data?.volunteer;
  const missing = v ? [!v.bio && 'bio', !v.skills?.length && 'skills', !normalizeAvailability(v.availability).length && 'availability'].filter(Boolean).length : 0;
  const nextTitle = next?.shift?.event?.title;
  const milestone = impact.data?.next_milestone;

  const starters = useMemo<{ icon: ReactNode; text: string; hue: string }[]>(
    () => [
      { icon: <Sparkles />, text: t('Suggest the best opportunities for me this week'), hue: 'indigo' },
      nextTitle ? { icon: <MapPin />, text: t('How far is {event} from me?', { event: nextTitle }), hue: 'sky' } : { icon: <MapPin />, text: t('Which open shifts are closest to me?'), hue: 'sky' },
      { icon: <CalendarClock />, text: t('When is my next shift and how do I check in?'), hue: 'amber' },
      { icon: <Award />, text: milestone ? t('How do I reach my {n}-hour certificate faster?', { n: milestone }) : t('How many hours until my next certificate?'), hue: 'emerald' },
      { icon: <UserCheck />, text: missing ? t("What's missing from my profile?") : t('Which of my skills are most in demand?'), hue: 'violet' },
      { icon: <Languages />, text: locale === 'am' ? 'What can you help me with?' : 'ለእኔ የሚስማሙ ዕድሎችን ጠቁመኝ', hue: 'rose' },
    ],
    [t, nextTitle, milestone, missing, locale],
  );

  const first = firstName(user?.full_name);
  const empty = messages.length === 0 && !send.isPending;
  const lastIndex = messages.length - 1;

  const body = (
    <div ref={frame} className={cn('flex flex-col overflow-hidden', desktop ? '-mx-9 -mb-9 -mt-8 h-[calc(100dvh-104px)]' : 'fixed inset-x-0 top-0 z-40 h-dvh bg-bg')}>
      {/* Header */}
      <header className={cn('relative z-10 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5', desktop ? 'h-[76px] px-7' : 'min-h-[60px] pt-[env(safe-area-inset-top)]')}>
        {!desktop && (
          <Button variant="ghost" size="icon" aria-label={t('Back')} onClick={() => navigate('/v')}>
            <ArrowLeft />
          </Button>
        )}
        <BotOrb size={desktop ? 42 : 36} thinking={send.isPending} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-extrabold tracking-[-0.02em] text-text [font-family:var(--font-display)]">VolunBot</span>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-accent-text">AI</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className={cn('size-1.5 shrink-0 rounded-full', send.isPending || degraded ? 'bg-[var(--hue-amber)]' : 'bg-success')} />
            <span className="truncate">{send.isPending ? t('Looking at your latest data…') : degraded ? t('Quick mode · answering from your data') : t('Live · knows your profile, shifts and impact')}</span>
          </div>
        </div>
        <Menu>
          <MenuTrigger asChild>
            <button
              className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors', hasLocation ? 'bg-success-soft text-success-text' : 'bg-surface-2 text-muted hover:text-text')}
              aria-label={t('Location')}
            >
              {hasLocation ? <LocateFixed className="size-4" /> : <MapPin className="size-4" />}
              <span className="hidden sm:inline">{hasLocation ? (pending?.label ?? serverLocation?.label ?? t('Location on')) : t('Location off')}</span>
            </button>
          </MenuTrigger>
          <MenuContent align="end" className="w-60">
            <MenuItem onSelect={quickGps.request}>
              <Crosshair /> {t('Use my phone location')}
            </MenuItem>
            <MenuItem onSelect={() => setMapOpen(true)}>
              <MapIcon /> {t('Pick on the map')}
            </MenuItem>
            {hasLocation && (
              <MenuItem danger onSelect={forgetLocation}>
                <MapPin /> {t('Stop using my location')}
              </MenuItem>
            )}
          </MenuContent>
        </Menu>
        <Button variant="ghost" size={desktop ? 'sm' : 'icon'} onClick={() => setHistoryOpen(true)} aria-label={t('Chat history')}>
          <History /> {desktop && t('History')}
        </Button>
        {messages.length > 0 && (
          <Button variant="ghost" size={desktop ? 'sm' : 'icon'} onClick={() => openThread('new')} aria-label={t('New chat')}>
            <SquarePen /> {desktop && t('New chat')}
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Conversation */}
          <div ref={scroller} className="vb-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite" aria-label={t('Conversation')}>
            <div className="mx-auto w-full max-w-[860px] px-4 pb-6 pt-5 sm:px-6">
              {empty ? (
                <Welcome
                  name={first}
                  loading={history.isLoading}
                  next={next}
                  hoursToNext={impact.data?.hours_to_next}
                  nextMilestone={milestone}
                  totalHours={impact.data?.total_hours}
                  skills={v?.skills ?? []}
                  starters={starters}
                  onAsk={askText}
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((m, i) => (
                    <Bubble
                      key={`${i}-${m.created_at}`}
                      m={m}
                      userName={user?.full_name}
                      userPhoto={user?.profile_photo_url}
                      latest={i === lastIndex && !send.isPending}
                      needsLocation={!hasLocation}
                      onAsk={askText}
                      onShare={shareAndRetry}
                    />
                  ))}
                  <AnimatePresence>{send.isPending && <Thinking key="thinking" withLocation={hasLocation} />}</AnimatePresence>
                  {send.error && (
                    <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-danger-soft px-4 py-3 text-[13.5px] text-danger-text">
                      <span className="flex-1">{errorMessage(send.error)}</span>
                      {lastInput.current && (
                        <Button size="sm" variant="secondary" onClick={() => lastInput.current && send.mutate(lastInput.current)}>
                          <RotateCcw /> {t('Try again')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Composer desktop={desktop} busy={send.isPending} hasLocation={hasLocation} locating={quickGps.locating} locale={locale} onSend={askText} onLocation={onLocationButton} />
        </div>
        {desktop && (
          <ContextPanel
            name={user?.full_name ?? ''}
            photo={user?.profile_photo_url}
            skills={v?.skills ?? []}
            availability={v ? normalizeAvailability(v.availability) : []}
            next={next}
            hours={impact.data?.total_hours}
            score={impact.data?.impact_score}
            nextMilestone={milestone}
            locationLabel={hasLocation ? (pending?.label ?? serverLocation?.label ?? t('Shared for this chat')) : null}
            onLocation={() => setMapOpen(true)}
          />
        )}
      </div>

      <MapPickerDialog open={mapOpen} onOpenChange={setMapOpen} onPick={(l) => setPending(l)} />
      <ThreadsSheet open={historyOpen} onOpenChange={setHistoryOpen} activeId={history.data?.threadId ?? null} onPick={(id) => openThread(id)} onNew={() => openThread('new')} />
    </div>
  );

  if (desktop) return body;
  return createPortal(body, document.body);
}

/** The message box keeps its own draft, so typing never re-renders the conversation. */
const Composer = memo(function Composer({
  desktop,
  busy,
  hasLocation,
  locating,
  locale,
  onSend,
  onLocation,
}: {
  desktop: boolean;
  busy: boolean;
  hasLocation: boolean;
  locating: boolean;
  locale: string;
  onSend: (text: string) => void;
  onLocation: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const am = ETHIOPIC.test(draft);

  // Grow with the text (up to 5 lines) — one measurement per frame at most.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
  };

  const toggleMic = () => {
    if (!SpeechCtor) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new SpeechCtor();
    r.lang = locale === 'am' ? 'am-ET' : 'en-US';
    r.interimResults = true;
    r.onresult = (e) => setDraft(Array.from(e.results).map((x) => x[0]?.transcript ?? '').join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className={cn('relative shrink-0 border-t border-line bg-surface px-3 pt-2.5 sm:px-5', desktop ? 'pb-3' : 'pb-[max(14px,calc(env(safe-area-inset-bottom)+8px))]')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto flex max-w-[860px] items-end gap-1.5 rounded-[24px] bg-surface p-1.5 [box-shadow:inset_0_0_0_1px_var(--line-strong)] focus-within:[box-shadow:inset_0_0_0_2px_var(--accent)]"
      >
        <button
          type="button"
          onClick={onLocation}
          className={cn('grid size-10 shrink-0 place-items-center rounded-full transition-colors', hasLocation ? 'bg-success-soft text-success-text' : 'text-muted hover:bg-surface-2 hover:text-text')}
          aria-label={hasLocation ? t('Change my location') : t('Share my location')}
        >
          {locating ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : hasLocation ? <LocateFixed className="size-[18px]" /> : <MapPin className="size-[18px]" />}
        </button>
        <textarea
          ref={box}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={1000}
          enterKeyHint="send"
          placeholder={listening ? t('Listening…') : t('Ask VolunBot anything…')}
          aria-label={t('Message VolunBot')}
          lang={am ? 'am' : undefined}
          className={cn('block h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-5 text-text outline-none placeholder:text-faint', am && 'font-ethiopic')}
        />
        {SpeechCtor && (
          <button
            type="button"
            onClick={toggleMic}
            className={cn('grid size-10 shrink-0 place-items-center rounded-full transition-colors', listening ? 'bg-danger-soft text-danger-text' : 'text-muted hover:bg-surface-2 hover:text-text')}
            aria-label={listening ? t('Stop listening') : t('Speak your question')}
          >
            <Mic className={cn('size-[18px]', listening && 'animate-pulse')} />
          </button>
        )}
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),color-mix(in_oklab,var(--accent)_55%,#a855f7))] text-accent-fg transition-[opacity,transform] active:scale-90 disabled:opacity-35"
          aria-label={t('Send')}
        >
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" /> : <ArrowUp className="size-5" strokeWidth={2.5} />}
        </button>
      </form>
      <p className="mx-auto mt-1.5 hidden max-w-[860px] items-center justify-center gap-1.5 text-center text-[11px] text-faint sm:flex">
        <ShieldCheck className="size-3.5 shrink-0" />
        {t('VolunBot only sees your own VolunTrack data. Double-check important details.')}
      </p>
    </div>
  );
});

/* ------------------------------------------------------------------------- */

function Welcome({
  name,
  loading,
  next,
  hoursToNext,
  nextMilestone,
  totalHours,
  skills,
  starters,
  onAsk,
}: {
  name: string;
  loading: boolean;
  next?: { shift?: { start_time: string; event?: { title: string } | null } | null; status: string };
  hoursToNext?: number;
  nextMilestone?: number | null;
  totalHours?: number;
  skills: string[];
  starters: { icon: ReactNode; text: string; hue: string }[];
  onAsk: (s: string) => void;
}) {
  const t = useT();
  const start = next?.shift ? parseApiDate(next.shift.start_time) : null;
  const cd = start ? countdownTo(start) : null;
  const progress = nextMilestone && totalHours != null ? Math.min(100, (totalHours / nextMilestone) * 100) : 100;

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <BotOrb size={64} thinking glow />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4 text-center sm:pt-8">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
        <BotOrb size={72} glow className="sm:scale-[1.17]" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 text-[clamp(1.7rem,5vw,2.4rem)] sm:mt-7 font-extrabold leading-[1.08] tracking-[-0.04em] text-text [font-family:var(--font-display)]">
        {t(greeting())}, <span className="bg-[linear-gradient(120deg,var(--accent),#a855f7_55%,#ec4899)] bg-clip-text text-transparent">{name || t('there')}</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted">
        {t('I know your shifts, hours, skills and every open opportunity. Ask me anything about your volunteering — in English or Amharic.')}
      </motion.p>

      {/* Live snapshot */}
      <div className="vb-no-scrollbar mt-5 flex w-[calc(100%+2rem)] snap-x scroll-px-4 gap-3 self-center overflow-x-auto px-4 pb-6 pt-2 sm:grid sm:w-full sm:grid-cols-3 sm:overflow-visible sm:px-0">
        <Snapshot
          delay={0.22}
          hue="amber"
          icon={<CalendarClock />}
          label={t('Next shift')}
          value={next?.shift?.event?.title ?? t('Nothing booked')}
          hint={start && cd ? (cd.days > 0 ? t('{d} days · {day}', { d: cd.days, day: formatDay(next!.shift!.start_time) }) : `${formatDay(next!.shift!.start_time)} · ${formatTime(next!.shift!.start_time)}`) : t('Tap to find one')}
          onClick={() => onAsk(next ? t('Tell me about my next shift') : t('Suggest the best opportunities for me this week'))}
        />
        <Snapshot
          delay={0.28}
          hue="emerald"
          icon={<Award />}
          label={t('Next certificate')}
          value={nextMilestone ? t('{h} h to go', { h: Math.round((hoursToNext ?? 0) * 10) / 10 }) : t('All earned')}
          hint={nextMilestone ? t('{n}-hour milestone', { n: nextMilestone }) : t('Every milestone reached')}
          progress={progress}
          onClick={() => onAsk(t('How many hours until my next certificate?'))}
        />
        <Snapshot
          delay={0.34}
          hue="indigo"
          icon={<Zap />}
          label={t('Your skills')}
          value={skills.length ? skills.slice(0, 2).map(humanizeSkill).join(', ') : t('None added')}
          hint={skills.length > 2 ? t('+{n} more', { n: skills.length - 2 }) : t('See where they fit')}
          onClick={() => onAsk(t('Which open shifts match my skills best?'))}
        />
      </div>

      <div className="mt-8 w-full text-left">
        <div className="mb-3 px-1 text-[12.5px] font-semibold text-muted">{t('Try asking')}</div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {starters.map((s, i) => (
            <motion.button
              key={s.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 + i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAsk(s.text)}
              lang={ETHIOPIC.test(s.text) ? 'am' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-[18px] bg-surface p-3 text-left text-[14px] font-medium text-text [box-shadow:0_1px_2px_rgba(17,21,43,0.04),inset_0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:[box-shadow:0_14px_28px_-20px_rgba(17,21,43,0.45),inset_0_0_0_1px_var(--line-strong)]',
                ETHIOPIC.test(s.text) && 'font-ethiopic',
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[12px] [&_svg]:size-[18px]" style={{ background: `var(--hue-${s.hue}-soft)`, color: `var(--hue-${s.hue})` }}>
                {s.icon}
              </span>
              <span className="flex-1 leading-snug">{s.text}</span>
              <ArrowUp className="size-4 rotate-45 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Snapshot({ icon, label, value, hint, hue, progress, delay, onClick }: { icon: ReactNode; label: string; value: string; hint: string; hue: string; progress?: number; delay: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-[220px] shrink-0 snap-start overflow-hidden rounded-[20px] bg-surface p-4 text-left [box-shadow:0_12px_30px_-24px_rgba(17,21,43,0.5),inset_0_0_0_1px_var(--line)] sm:w-auto"
    >
      <span className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full" style={{ background: `radial-gradient(circle, var(--hue-${hue}-soft), transparent 70%)` }} />
      <span className="relative flex items-center gap-2 text-[12px] font-semibold text-muted">
        <span className="grid size-7 place-items-center rounded-[9px] [&_svg]:size-4" style={{ background: `var(--hue-${hue}-soft)`, color: `var(--hue-${hue})` }}>
          {icon}
        </span>
        {label}
      </span>
      <span className="relative mt-3 block truncate text-[15.5px] font-bold tracking-[-0.01em] text-text [font-family:var(--font-display)]">{value}</span>
      <span className="relative mt-0.5 block truncate text-[12.5px] text-muted">{hint}</span>
      {progress != null && (
        <span className="relative mt-2.5 block h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.span className="block h-full rounded-full" style={{ background: `var(--hue-${hue})` }} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: delay + 0.2, duration: 0.9 }} />
        </span>
      )}
    </motion.button>
  );
}

const Bubble = memo(function Bubble({
  m,
  userName,
  userPhoto,
  latest,
  needsLocation,
  onAsk,
  onShare,
}: {
  m: ChatMessage;
  userName?: string;
  userPhoto?: string | null;
  latest: boolean;
  needsLocation: boolean;
  onAsk: (s: string) => void;
  onShare: (l: SharedLocation) => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const content = typeof m.content === 'string' ? m.content : '';
  const am = ETHIOPIC.test(content);

  if (m.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }} className="flex items-end justify-end gap-2.5">
        <div
          lang={am ? 'am' : undefined}
          className={cn(
            'max-w-[82%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-[8px] bg-[linear-gradient(135deg,var(--accent),color-mix(in_oklab,var(--accent)_62%,#a855f7))] px-4 py-2.5 text-[15px] leading-relaxed text-accent-fg shadow-[0_10px_24px_-14px_var(--accent)]',
            am && 'font-ethiopic',
          )}
        >
          {content}
        </div>
        <Avatar name={userName ?? ""} src={userPhoto} size="sm" className="hidden sm:inline-flex" />
      </motion.div>
    );
  }

  const cards = m.cards ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex gap-3">
      <BotOrb size={30} still className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div lang={am ? 'am' : undefined} className={cn('max-w-[640px] break-words text-[15px] leading-[1.65] text-text/90', am && 'font-ethiopic')}>
          <RichText text={content} />
        </div>

        {cards.length > 0 && (
          <div className="vb-no-scrollbar -mb-3 -ml-[42px] -mr-4 mt-1 flex snap-x snap-mandatory scroll-pl-[42px] gap-3 overflow-x-auto pb-6 pl-[42px] pr-4 pt-2.5 sm:-mr-6 sm:pr-6 lg:m-0 lg:mt-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] lg:overflow-visible lg:p-0">
            {cards.map((c, i) => (
              <ShiftCard key={c.shift_id} card={c} index={i} />
            ))}
          </div>
        )}

        {m.ask_location && latest && needsLocation && (
          <div className="mt-3.5">
            <LocationRequest onShare={onShare} />
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-[11.5px] text-faint">
          <span>{formatTime(m.created_at)}</span>
          {m.degraded && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning-text">
              <Zap className="size-3" /> {t('Quick mode')}
            </span>
          )}
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(content.replace(/\*\*/g, ''));
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="ml-1 grid size-7 place-items-center rounded-full hover:bg-surface-2 hover:text-text"
            aria-label={t('Copy reply')}
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {latest && (m.follow_ups?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.follow_ups!.map((f, i) => (
              <motion.button
                key={f}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onAsk(f)}
                lang={ETHIOPIC.test(f) ? 'am' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium text-text [box-shadow:inset_0_0_0_1px_var(--line-strong)] transition-colors hover:bg-accent-soft hover:text-accent-text hover:[box-shadow:inset_0_0_0_1px_transparent]',
                  ETHIOPIC.test(f) && 'font-ethiopic',
                )}
              >
                <Sparkles className="size-3.5 text-accent-text" />
                {f}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

