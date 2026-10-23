import { BarChart3, Download, FileSpreadsheet, FileText, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Report } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import { formatHours, formatNumber } from '@/shared/lib/format';
import { errorMessage, isApiError } from '@/shared/api/http';
import { cn } from '@/shared/lib/cn';
import { Badge, Button, Card, CardBody, CardHeader, DateRangePicker, EmptyState, ErrorState, Field, InlineAlert, Input, PageHeader, Select, Skeleton, notify } from '@/shared/ui';
import { Bars, ChartCard } from '@/shared/ui/charts';
import { peopleApi, useDeleteReport, useGenerateReport, useReports } from '@/features/people/api';

/** Quarters, months and years to report on (newest first). */
function periodOptions() {
  const now = new Date();
  const quarters = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    return { value: `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`, label: `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` };
  });
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  });
  return [...quarters, ...months, { value: String(now.getFullYear()), label: `Year ${now.getFullYear()}` }, { value: String(now.getFullYear() - 1), label: `Year ${now.getFullYear() - 1}` }];
}

async function download(blobPromise: Promise<Blob>, name: string) {
  const blob = await blobPromise;
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const reports = useReports();
  const gen = useGenerateReport();
  const del = useDeleteReport();
  const options = useMemo(periodOptions, []);
  const [period, setPeriod] = useState(options[0]!.value);
  const [range, setRange] = useState({ from: '', to: '' });
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Impact reports · VolunTrack';
  }, []);
  const list = reports.data ?? [];
  const current: Report | undefined = list.find((r) => r.id === selected) ?? list[0];
  const s = current?.summary;

  const exportAs = async (r: Report, format: 'csv' | 'pdf') => {
    setExporting(`${r.id}-${format}`);
    try {
      await download(peopleApi.exportReport(r.id, format), `impact-report-${r.period.replace(/\s+/g, '-')}.${format}`);
    } catch (e) {
      notify.error(isApiError(e) && e.status === 402 ? 'PDF reports are part of the Pro plan. CSV is available on every plan.' : errorMessage(e));
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Impact reports" title="Reports for donors and your board" description="Counts only coordinator-verified hours on your own shifts in the chosen period. Volunteers are anonymized." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="lg:self-start">
          <CardHeader title="Generate a report" />
          <CardBody className="space-y-4">
            <Field label="Period">
              <Select value={period} onValueChange={setPeriod} options={[...options, { value: 'custom', label: 'Custom dates…' }]} />
            </Field>
            {period === 'custom' && (
              <>
                <Field label="Dates">
                  <DateRangePicker value={range} onChange={setRange} />
                </Field>
                <Field label="Name" hint="e.g. “Meskel 2026 campaign”">
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={50} />
                </Field>
              </>
            )}
            {gen.error && <InlineAlert tone="danger">{errorMessage(gen.error)}</InlineAlert>}
            <Button
              className="w-full"
              loading={gen.isPending}
              disabled={period === 'custom' && (!range.from || !label.trim())}
              onClick={() =>
                gen.mutate(
                  period === 'custom' ? { period: label.trim(), from: range.from, to: range.to || range.from } : { period },
                  {
                    onSuccess: (r) => {
                      if (r.report) setSelected(r.report.id);
                      notify.success('Report ready', `${r.report?.period}: ${formatHours(r.report?.total_hours ?? 0)} verified`);
                    },
                  },
                )
              }
            >
              <BarChart3 /> Generate report
            </Button>
            <p className="flex items-start gap-2 text-[12.5px] text-faint">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> Names, emails, phone numbers and locations are never included.
            </p>
          </CardBody>
        </Card>

        {current && s ? (
          <Card className="min-w-0">
            <CardHeader
              title={current.period}
              description={`${formatDate(s.period_start, 'd MMM yyyy')} – ${formatDate(s.period_end, 'd MMM yyyy')}`}
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" loading={exporting === `${current.id}-csv`} onClick={() => exportAs(current, 'csv')}>
                    <Download /> CSV
                  </Button>
                  <Button size="sm" variant="secondary" loading={exporting === `${current.id}-pdf`} onClick={() => exportAs(current, 'pdf')}>
                    <FileText /> PDF
                  </Button>
                </div>
              }
            />
            <CardBody className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: 'Verified hours', v: formatHours(s.verified_hours) },
                  { l: 'Volunteers', v: formatNumber(s.volunteers) },
                  { l: 'Shifts worked', v: formatNumber(s.shifts_worked) },
                  { l: 'Attendance', v: s.attendance_rate != null ? `${s.attendance_rate}%` : '—' },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg bg-surface-2 px-3.5 py-3">
                    <dt className="text-xs text-muted">{k.l}</dt>
                    <dd className="type-data mt-1 text-xl font-semibold text-text">{k.v}</dd>
                  </div>
                ))}
              </dl>
              {s.pending_hours > 0 && (
                <InlineAlert tone="info">
                  {formatHours(s.pending_hours)} in this period are still waiting for verification and are not counted yet.
                </InlineAlert>
              )}
              {s.by_month.length > 1 && (
                <ChartCard title="Verified hours by month">
                  <Bars data={s.by_month} x="month" y="hours" unit=" h" height={180} />
                </ChartCard>
              )}
              <div className="vt-stack overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-[11.5px] tracking-wider text-faint uppercase">
                    <tr>
                      <th className="py-2 font-medium">Event</th>
                      <th className="py-2 font-medium">Places filled</th>
                      <th className="py-2 font-medium">Volunteers</th>
                      <th className="py-2 text-right font-medium">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.by_event.map((e) => (
                      <tr key={e.event_id}>
                        <td className="py-2.5 pr-3 font-medium text-text">{e.title}</td>
                        <td className="type-data py-2.5 text-muted">
                          {e.confirmed}/{e.places}
                        </td>
                        <td className="type-data py-2.5 text-muted">{e.volunteers}</td>
                        <td className="type-data py-2.5 text-right text-text">{formatHours(e.verified_hours)}</td>
                      </tr>
                    ))}
                    {s.by_event.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted">
                          No events in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="flex items-center gap-1.5 text-[12px] text-faint">
                <Lock className="size-3" /> PDF export is part of the Pro plan; CSV works on every plan.
              </p>
            </CardBody>
          </Card>
        ) : (
          <Card className="grid place-items-center p-10 text-center text-sm text-muted">Generate a report to see the breakdown here.</Card>
        )}
      </div>

      <h2 className="type-title mt-10 mb-4 text-lg text-text">All reports</h2>
      {reports.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : reports.error ? (
        <ErrorState error={reports.error} onRetry={() => reports.refetch()} />
      ) : !list.length ? (
        <EmptyState icon={<FileSpreadsheet />} title="No reports yet" description="Generate your first report above." />
      ) : (
        <Card className="vt-stack overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] tracking-wider text-faint uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Volunteers</th>
                <th className="px-5 py-3 font-medium">Verified hours</th>
                <th className="px-5 py-3 font-medium">Generated</th>
                <th className="px-5 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.id)} className={cn('cursor-pointer hover:bg-surface-2/50', current?.id === r.id && 'bg-accent-soft/50')}>
                  <td className="px-5 py-3.5 font-medium text-text">
                    {r.period} {r.status !== 'completed' && <Badge size="sm">{r.status}</Badge>}
                  </td>
                  <td className="type-data px-5 py-3.5 text-text">{formatNumber(r.total_volunteers)}</td>
                  <td className="type-data px-5 py-3.5 text-text">{formatHours(r.total_hours)}</td>
                  <td className="px-5 py-3.5 text-muted">{formatDate(r.created_at, 'd MMM yyyy')}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete report"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete the ${r.period} report?`)) del.mutate(r.id, { onSuccess: () => notify.success('Report deleted') });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
