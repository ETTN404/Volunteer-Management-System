import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Bot, Eraser } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Button, InlineAlert, Textarea } from '@/shared/ui';
import { useChatHistory, useClearChat, useSendChat } from '@/features/chat/api';
import { useSession } from '@/features/auth/use-session';
import { firstName } from '@/shared/lib/format';

const ETHIOPIC = /[ሀ-፿]/;

const SUGGESTIONS = ['When is my next shift?', 'How many hours until my next certificate?', 'How is my impact score calculated?', 'How do I check in?', 'ቀጣይ ፈረቃዬ መቼ ነው?'];

/** Renders **bold** segments from the assistant without allowing HTML. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

export default function AssistantPage() {
  const { user } = useSession();
  const history = useChatHistory();
  const send = useSendChat();
  const clear = useClearChat();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const messages = history.data ?? [];

  useEffect(() => {
    document.title = 'VolunBot · VolunTrack';
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, send.isPending]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || send.isPending) return;
    setDraft('');
    send.mutate(t);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] max-w-3xl flex-col lg:h-[calc(100dvh-10rem)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg">
          <Bot className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="type-title text-xl text-text">VolunBot</h1>
          <p className="text-[13px] text-muted">Answers from your schedule, hours and announcements · English or አማርኛ</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => clear.mutate()} loading={clear.isPending}>
            <Eraser /> New chat
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)] sm:p-6" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && !send.isPending ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="type-title text-2xl text-text">Selam, {firstName(user?.full_name)}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted">Ask about your shifts, hours, certificates or how check-in works.</p>
            <div className="mt-7 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)} lang={ETHIOPIC.test(s) ? 'am' : undefined} className={cn('rounded-full px-3.5 py-2 text-[13px] text-text transition-colors [box-shadow:inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2', ETHIOPIC.test(s) && 'font-ethiopic')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const am = ETHIOPIC.test(m.content);
                const mine = m.role === 'user';
                return (
                  <motion.div key={`${i}-${m.created_at}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                    <div
                      lang={am ? 'am' : undefined}
                      className={cn('max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed', am && 'font-ethiopic', mine ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md bg-surface-2 text-text')}
                    >
                      {mine ? m.content : <Rich text={m.content} />}
                    </div>
                    <span className="px-1 text-[11px] text-faint">{formatTime(m.created_at)}</span>
                  </motion.div>
                );
              })}
              {send.isPending && (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3.5" aria-label="VolunBot is typing">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="size-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}
      </div>

      {send.error && (
        <InlineAlert tone="danger" className="mt-3">
          {errorMessage(send.error)}
        </InlineAlert>
      )}

      <form onSubmit={onSubmit} className="relative mt-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder="Ask VolunBot…"
          aria-label="Message VolunBot"
          className="min-h-14 resize-none pr-14"
        />
        <Button type="submit" size="icon" className="absolute bottom-2.5 right-2.5" disabled={!draft.trim()} loading={send.isPending} aria-label="Send">
          <ArrowUp />
        </Button>
      </form>
    </div>
  );
}
