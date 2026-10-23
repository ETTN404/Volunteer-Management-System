import { MessageSquareText, SquarePen, Trash2 } from 'lucide-react';
import { isToday, isYesterday, subDays } from 'date-fns';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatTime, parseApiDate } from '@/shared/lib/time';
import { useT } from '@/shared/i18n';
import { Button, Sheet, SheetContent, Skeleton } from '@/shared/ui';
import { useChatThreads, useDeleteThread, type ChatThread } from '../api';
import { ETHIOPIC } from './parts';

/** Past conversations — reopen any of them, or start a new one. */
export function ThreadsSheet({
  open,
  onOpenChange,
  activeId,
  onPick,
  onNew,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activeId: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
}) {
  const t = useT();
  const threads = useChatThreads(open);
  const del = useDeleteThread();

  const groups: { label: string; items: ChatThread[] }[] = [];
  for (const th of threads.data ?? []) {
    const d = parseApiDate(th.updated_at ?? th.created_at);
    const label = !d ? t('Earlier') : isToday(d) ? t('Today') : isYesterday(d) ? t('Yesterday') : d > subDays(new Date(), 7) ? t('This week') : t('Earlier');
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(th);
    else groups.push({ label, items: [th] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        width="sm"
        title={t('Chat history')}
        header={
          <div className="px-5 pb-4 pt-5 pr-16">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-text [font-family:var(--font-display)]">{t('Chat history')}</div>
          <Button
            className="mt-3.5 w-full"
            onClick={() => {
              onNew();
              onOpenChange(false);
            }}
          >
            <SquarePen /> {t('New chat')}
          </Button>
          </div>
        }
      >
        {threads.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-[14px]" />
            ))}
          </div>
        ) : !threads.data?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
              <MessageSquareText className="size-5" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-text">{t('No conversations yet')}</p>
            <p className="mt-1 max-w-[220px] text-[13px] text-muted">{t('Your chats with VolunBot are saved here so you can pick them up later.')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="mb-1.5 px-1 text-[11.5px] font-semibold text-faint">{g.label}</div>
                <ul className="space-y-1">
                  {g.items.map((th) => {
                    const on = th.id === activeId;
                    const d = parseApiDate(th.updated_at ?? th.created_at);
                    return (
                      <li key={th.id} className="group relative">
                        <button
                          onClick={() => {
                            onPick(th.id);
                            onOpenChange(false);
                          }}
                          className={cn('flex w-full flex-col rounded-[14px] px-3 py-2.5 pr-11 text-left transition-colors', on ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                        >
                          <span lang={ETHIOPIC.test(th.title) ? 'am' : undefined} className={cn('truncate text-[14px] font-semibold', on ? 'text-accent-text' : 'text-text', ETHIOPIC.test(th.title) && 'font-ethiopic')}>
                            {th.title}
                          </span>
                          <span className="mt-0.5 truncate text-[12.5px] text-muted">{th.preview || '—'}</span>
                          <span className="mt-1 text-[11px] text-faint">
                            {d ? (isToday(d) ? formatTime(d) : formatDate(d, 'd MMM, HH:mm')) : ''} · {t('{n} messages', { n: th.messages_count })}
                          </span>
                        </button>
                        <button
                          onClick={() => del.mutate(th.id, { onSuccess: () => th.id === activeId && onNew() })}
                          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:bg-danger-soft hover:text-danger-text"
                          aria-label={t('Delete conversation')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
