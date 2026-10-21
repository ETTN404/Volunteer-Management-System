import { Check, Copy, CreditCard, Gem, Receipt, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PlanKey } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { formatDate } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, CardBody, CardHeader, ErrorState, Field, FormError, InlineAlert, Input, PageHeader, Segmented, Select, Skeleton, notify } from '@/shared/ui';
import { FEATURE_LABELS, LIMIT_LABELS, useBilling, useSubmitPayment } from '@/features/organization/api';

const MONTHS = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months · 10% off' },
  { value: '12', label: '12 months · 20% off' },
];
const DISCOUNT: Record<string, number> = { '1': 0, '3': 0, '6': 0.1, '12': 0.2 };

export default function BillingPage() {
  const billing = useBilling();
  const pay = useSubmitPayment();
  const [plan, setPlan] = useState<'pro' | 'enterprise'>('pro');
  const [months, setMonths] = useState('1');
  const [method, setMethod] = useState('telebirr');
  const [ref, setRef] = useState('');
  const [payer, setPayer] = useState('');
  const [suffix, setSuffix] = useState('');

  useEffect(() => {
    document.title = 'Plan & billing · VolunTrack';
  }, []);

  const b = billing.data;
  const catalog = b?.catalog ?? [];
  const price = catalog.find((p) => p.key === plan)?.price_monthly ?? 0;
  const amount = useMemo(() => Math.round(price * Number(months) * (1 - (DISCOUNT[months] ?? 0)) * 100) / 100, [price, months]);
  const m = b?.payment_methods.find((x) => x.key === method);

  if (billing.isLoading) return <Skeleton className="h-[600px] rounded-xl" />;
  if (billing.error || !b) return <ErrorState error={billing.error} onRetry={() => billing.refetch()} />;

  return (
    <>
      <PageHeader eyebrow="Organization" title="Plan & billing" description="Every organization starts free. Upgrade when you need more coordinators, events or Pro features." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={`You’re on ${b.plan_name}`}
              description={b.plan_expires_at ? `Paid until ${formatDate(b.plan_expires_at, 'd MMMM yyyy')}` : b.plan === 'free' ? 'No payment needed.' : undefined}
              action={<Badge tone={b.plan === 'free' ? 'neutral' : 'accent'}>{b.plan_name}</Badge>}
            />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {Object.entries(b.limits).map(([k, v]) => {
                const pct = v.limit ? Math.min(100, Math.round((v.used / v.limit) * 100)) : 0;
                return (
                  <div key={k} className="rounded-lg bg-surface-2 p-3.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{LIMIT_LABELS[k] ?? k}</span>
                      <span className="type-data text-text">
                        {formatNumber(v.used)} / {v.limit == null ? '∞' : formatNumber(v.limit)}
                      </span>
                    </div>
                    {v.limit != null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                        <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-accent')} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {catalog.map((p) => {
              const current = p.key === b.plan;
              return (
                <Card key={p.key} className={cn('flex flex-col p-5', current && '[box-shadow:inset_0_0_0_2px_var(--accent)]')}>
                  <div className="flex items-center justify-between">
                    <h3 className="type-title text-lg text-text">{p.name}</h3>
                    {current && <Badge size="sm" tone="accent">Current</Badge>}
                  </div>
                  <div className="type-display mt-3 text-3xl text-text">
                    {p.price_monthly ? formatNumber(p.price_monthly) : '0'}
                    <span className="text-sm font-medium text-muted"> ETB / month</span>
                  </div>
                  <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-muted">
                    {(['coordinators', 'active_events', 'volunteers', 'broadcasts_per_month'] as const).map((k) => (
                      <li key={k} className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                        {p.limits[k] == null ? 'Unlimited' : formatNumber(p.limits[k]!)} {LIMIT_LABELS[k]?.toLowerCase()}
                      </li>
                    ))}
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold" />
                        {FEATURE_LABELS[f] ?? f}
                      </li>
                    ))}
                  </ul>
                  {p.key !== 'free' && !current && (
                    <Button className="mt-4" variant={p.key === 'pro' ? 'primary' : 'secondary'} onClick={() => setPlan(p.key as 'pro' | 'enterprise')}>
                      <Gem /> Choose {p.name}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Payment history" />
            <CardBody>
              {b.payments.length === 0 ? (
                <p className="text-sm text-muted">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {b.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                      <Receipt className="size-4 text-faint" />
                      <span className="font-medium text-text">
                        {p.plan.toUpperCase()} · {p.months} mo
                      </span>
                      <span className="type-data text-muted">
                        {formatNumber(p.amount)} {p.currency}
                      </span>
                      <span className="type-data text-[12px] text-faint">
                        {p.method} · {p.transaction_ref}
                      </span>
                      <span className="text-[12px] text-faint">{formatDate(p.created_at, 'd MMM yyyy')}</span>
                      <Badge size="sm" tone={p.status === 'verified' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'} className="ml-auto">
                        {p.status === 'pending' ? 'Being checked' : p.status}
                      </Badge>
                      {(p.notes || p.verification_note) && p.status !== 'verified' && <p className="w-full text-[12.5px] text-muted">{p.notes ?? p.verification_note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader title="Upgrade" description="Pay with telebirr or a bank transfer, then paste the transaction reference." />
          <CardBody className="space-y-4">
            <Segmented
              value={plan}
              onValueChange={setPlan}
              aria-label="Plan"
              options={catalog.filter((p) => p.key !== 'free').map((p) => ({ value: p.key as PlanKey, label: p.name })) as { value: 'pro' | 'enterprise'; label: string }[]}
            />
            <Field label="Billing period">
              <Select value={months} onValueChange={setMonths} options={MONTHS} />
            </Field>
            <div className="rounded-lg bg-accent-soft px-4 py-3">
              <div className="text-xs text-accent-text">Amount to pay</div>
              <div className="type-display text-3xl text-text">
                {formatNumber(amount)} <span className="text-base font-medium text-muted">{b.currency}</span>
              </div>
            </div>
            <Field label="Pay with">
              <Select value={method} onValueChange={setMethod} options={b.payment_methods.map((x) => ({ value: x.key, label: x.name }))} />
            </Field>
            {m && (
              <div className="rounded-lg bg-surface-2 p-3.5 text-sm">
                <div className="text-muted">Send exactly {formatNumber(amount)} ETB to</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="type-data text-lg font-semibold text-text">{m.account || '—'}</span>
                  {m.account && (
                    <button type="button" aria-label="Copy account" className="text-faint hover:text-text" onClick={() => (navigator.clipboard.writeText(m.account), notify.success('Copied'))}>
                      <Copy className="size-4" />
                    </button>
                  )}
                </div>
                <div className="text-muted">{b.account_name}</div>
              </div>
            )}
            <Field label="Transaction reference" hint={m?.reference_hint}>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} className="type-code uppercase" placeholder="e.g. FT26123ABCDE" />
            </Field>
            {m?.needs_suffix && (
              <Field label="Last digits of the paying account" hint="Needed by this bank to look up the receipt.">
                <Input value={suffix} onChange={(e) => setSuffix(e.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" className="type-data" />
              </Field>
            )}
            <Field label="Paid by" optional>
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Name on the account" />
            </Field>
            <FormError message={pay.error ? errorMessage(pay.error) : null} />
            {pay.data && (
              <InlineAlert tone={pay.data.payment.status === 'verified' ? 'success' : pay.data.payment.status === 'rejected' ? 'danger' : 'info'}>{pay.data.message}</InlineAlert>
            )}
            <Button
              className="w-full"
              size="lg"
              loading={pay.isPending}
              disabled={ref.trim().length < 6 || (m?.needs_suffix && suffix.length < 4)}
              onClick={() =>
                pay.mutate(
                  { plan, months: Number(months) as 1 | 3 | 6 | 12, method, transaction_ref: ref.trim(), payer_name: payer.trim() || null, payer_account_suffix: suffix || null },
                  { onSuccess: (r) => r.payment.status !== 'rejected' && setRef('') },
                )
              }
            >
              <CreditCard /> Submit payment
            </Button>
            <p className="flex items-start gap-2 text-[12.5px] text-faint">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              {b.auto_verification
                ? 'We check the reference with the bank automatically. If the bank can’t be reached, the platform team confirms it within a business day.'
                : 'The platform team confirms your payment within a business day.'}
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
