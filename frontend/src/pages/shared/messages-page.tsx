import { ArrowLeft, Inbox, MessageSquarePlus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, Checkbox, Combobox, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Field, FormError, Input, PageHeader, Segmented, Skeleton, Textarea, notify } from '@/shared/ui';
import { useReplyThread, useSetThreadStatus, useStartThread, useThread, useThreads, type SupportSide } from '@/features/support/api';
import { useAllOrganizations } from '@/features/platform/api';

function NewThreadDialog({ side, open, onOpenChange, onCreated }: { side: SupportSide; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id?: number) => void }) {
  const start = useStartThread(side);
  // Only the platform side picks an organization (org admins may not list them).
  const orgs = useAllOrganizations(side === 'platform' && open);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [all, setAll] = useState(false);
  const [orgId, setOrgId] = useState('');
  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
      setAll(false);
      setOrgId('');
      start.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const platform = side === 'platform';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={platform ? 'Message organizations' : 'Contact the VolunTrack team'} description={platform ? 'Their admins get a notification and can reply here.' : 'Billing, verification, a bug, an idea — we usually answer within a business day.'}>
        <div className="space-y-4">
          {platform && (
            <>
              <Checkbox checked={all} onCheckedChange={(c) => setAll(c === true)} label="Send to every organization" description="Creates one private conversation per organization (suspended ones excluded)." />
              {!all && (
                <Field label="Organization">
                  <Combobox
                    value={orgId}
                    onChange={setOrgId}
                    loading={orgs.isLoading}
                    placeholder="Choose an organization"
                    options={(orgs.data ?? []).map((o) => ({ value: String(o.id), label: o.name, hint: o.status }))}
                  />
                </Field>
              )}
            </>
          )}
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </Field>
          <Field label="Message">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={5000} />
          </Field>
          <FormError message={start.error ? errorMessage(start.error) : null} />
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={start.isPending}
            disabled={!subject.trim() || !body.trim() || (platform && !all && !orgId)}
            onClick={() =>
              start.mutate(
                { subject: subject.trim(), body: body.trim(), ...(platform ? (all ? { all: true } : { org_ids: [Number(orgId)] }) : {}) },
                {
                  onSuccess: (r) => {
                    notify.success(r.message ?? 'Message sent');
                    onOpenChange(false);
                    onCreated('id' in (r.data as object) ? (r.data as { id: number }).id : undefined);
                  },
                },
              )
            }
          >
            <Send /> Send
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

/** Platform ↔ organization conversations. /p/messages for SuperAdmins, /o/messages for org admins. */
export default function MessagesPage() {
  const side: SupportSide = useLocation().pathname.startsWith('/p') ? 'platform' : 'org';
  const base = side === 'platform' ? '/p/messages' : '/o/messages';
  const params = useParams();
  const navigate = useNavigate();
  const activeId = params.threadId ? Number(params.threadId) : null;
  const [status, setStatus] = useState<'open' | 'closed' | ''>('open');
  const threads = useThreads(side, status);
  const thread = useThread(side, activeId);
  const reply = useReplyThread(side);
  const setThreadStatus = useSetThreadStatus(side);
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Messages · VolunTrack';
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [thread.data?.messages?.length]);

  const list = threads.data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow={side === 'platform' ? 'Platform' : 'Organization'}
        title="Messages"
        description={side === 'platform' ? 'Conversations with organizations: notices, verification, billing and support.' : 'Your conversations with the VolunTrack team.'}
        actions={
          <Button onClick={() => setComposing(true)}>
            <MessageSquarePlus /> New message
          </Button>
        }
      />
      <div className="grid min-h-[60vh] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className={cn('min-w-0 overflow-hidden', activeId && 'hidden lg:block')}>
          <div className="border-b border-line p-3">
            <Segmented
              value={status}
              onValueChange={setStatus}
              size="sm"
              aria-label="Status"
              options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
                { value: '', label: 'All' },
              ]}
            />
          </div>
          {threads.isLoading ? (
            <Skeleton className="m-3 h-40" />
          ) : threads.error ? (
            <ErrorState error={threads.error} onRetry={() => threads.refetch()} className="m-3" />
          ) : list.length === 0 ? (
            <EmptyState icon={<Inbox />} title="No conversations" className="m-3 shadow-none" />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((t) => (
                <li key={t.id}>
                  <Link to={`${base}/${t.id}`} className={cn('block px-4 py-3 hover:bg-surface-2', activeId === t.id && 'bg-accent-soft')}>
                    <div className="flex items-center gap-2">
                      {t.unread && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                      <span className={cn('min-w-0 flex-1 truncate text-sm', t.unread ? 'font-semibold text-text' : 'text-text')}>{t.subject}</span>
                      <span className="shrink-0 text-[11px] text-faint">{t.last_message_at ? formatRelative(t.last_message_at) : ''}</span>
                    </div>
                    {side === 'platform' && <div className="truncate text-[12px] font-medium text-accent-text">{t.organization.name}</div>}
                    <div className="truncate text-[12.5px] text-muted">{t.last_message}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className={cn('flex min-w-0 flex-col', !activeId && 'hidden lg:flex')}>
          {!activeId ? (
            <EmptyState icon={<Inbox />} title="Choose a conversation" description="Or start a new one." className="m-auto shadow-none" />
          ) : thread.isLoading ? (
            <Skeleton className="m-5 h-60" />
          ) : thread.error || !thread.data ? (
            <ErrorState error={thread.error} onRetry={() => thread.refetch()} className="m-5" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
                <button type="button" className="lg:hidden" onClick={() => navigate(base)} aria-label="Back to conversations">
                  <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="type-title truncate text-base text-text">{thread.data.subject}</h2>
                  {side === 'platform' && (
                    <Link to={`/p/organizations/${thread.data.org_id}`} className="text-[12.5px] text-accent-text hover:underline">
                      {thread.data.organization.name}
                    </Link>
                  )}
                </div>
                <Badge size="sm" tone={thread.data.status === 'open' ? 'success' : 'neutral'}>
                  {thread.data.status}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => setThreadStatus.mutate({ id: thread.data!.id, status: thread.data!.status === 'open' ? 'closed' : 'open' })}>
                  {thread.data.status === 'open' ? 'Close' : 'Reopen'}
                </Button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: '55vh' }}>
                {thread.data.messages?.map((m) => (
                  <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', m.mine ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-text')}>
                      <div className={cn('mb-0.5 text-[11px]', m.mine ? 'text-accent-fg/75' : 'text-faint')}>
                        {m.side === 'platform' ? 'VolunTrack team' : thread.data!.organization.name} · {m.author?.name} · {formatRelative(m.created_at)}
                      </div>
                      <p className="whitespace-pre-line wrap-anywhere">{m.body}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form
                className="flex gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  reply.mutate({ id: thread.data!.id, body: text.trim() }, { onSuccess: () => setText(''), onError: (er) => notify.error(errorMessage(er)) });
                }}
              >
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write a reply…" className="min-h-0 flex-1" aria-label="Reply" />
                <Button type="submit" loading={reply.isPending} disabled={!text.trim()} className="self-end">
                  <Send />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
      <NewThreadDialog side={side} open={composing} onOpenChange={setComposing} onCreated={(id) => id && navigate(`${base}/${id}`)} />
    </>
  );
}
