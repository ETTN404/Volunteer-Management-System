import { BarChart3, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '@/shared/lib/time';
import { formatHours, formatNumber } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, EmptyState, ErrorState, Field, InlineAlert, Input, PageHeader, Select, Skeleton, notify } from '@/shared/ui';
import { Bars, ChartCard } from '@/shared/ui/charts';
import { CountUp } from '@/shared/motion';
import { peopleApi, useGenerateReport, useReports } from '@/features/people/api';

/** Last six quarters (newest first) plus this and last year. */
function periodOptions() {
  const now = new Date();
  const quarters = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  });
  return [...quarters, String(now.getFullYear()), String(now.getFullYear() - 1)];
}

export default function ReportsPage() {
  const reports = useReports();
  const gen = useGenerateReport();
  const options = useMemo(periodOptions, []);
  const [period, setPeriod] = useState(options[0]!);
  const [custom, setCustom] = useState('');
  const [background, setBackground] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Impact reports · VolunTrack';
  }, []);
  const latest = reports.data?.[0];
  const chart = [...(reports.data ?? [])].reverse().map((r) => ({ period: r.period, hours: r.total_hours }));

  const exportCsv = async (id: number, name: string) => {
    setExporting(id);
    try {
      const blob = await peopleApi.exportReport(id, 'csv');
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `impact-report-${name.replace(/\s+/g, '-')}.csv` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(e, 'Export isn’t available yet.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Impact reports" title="Reports for donors" description="Totals of volunteers and hours for a period. Personal details are anonymized before anything leaves VolunTrack." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader title="Generate a report" />
          <CardBody className="space-y-4">
            <Field label="Period">
              <Select value={period} onValueChange={setPeriod} options={[...options.map((o) => ({ value: o, label: o })), { value: 'custom', label: 'Custom label…' }]} />
            </Field>
            {period === 'custom' && (
              <Field label="Custom period" hint="Up to 50 characters, e.g. “Meskel 2026 campaign”">
                <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={50} />
              </Field>
            )}
            <Checkbox label="Compile in the background" description="For large organizations — you’ll find it in the list when it’s ready." checked={background} onCheckedChange={(c) => setBackground(c === true)} />
            {gen.error && <InlineAlert tone="danger">{errorMessage(gen.error)}</InlineAlert>}
            <Button
              className="w-full"
              loading={gen.isPending}
              disabled={period === 'custom' && !custom.trim()}
              onClick={() =>
                gen.mutate(
                  { period: period === 'custom' ? custom.trim() : period, async: background },
                  { onSuccess: (r) => notify.success(r.queued ? 'Report queued' : 'Report ready', r.queued ? 'It will appear in the list shortly.' : `${r.report?.period}: ${formatHours(r.report?.total_hours ?? 0)}`) },
                )
              }
            >
              <BarChart3 /> Generate report
            </Button>
            <p className="flex items-start gap-2 text-[12.5px] text-faint">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> Names, emails and phone numbers are never included.
            </p>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {latest && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="type-eyebrow-sm">Latest · {latest.period}</div>
                <div className="type-display mt-2 text-4xl text-text">
                  <CountUp value={latest.total_hours} />
                  <span className="text-lg text-faint"> h</span>
                </div>
                <div className="mt-1 text-[13px] text-muted">volunteer hours</div>
              </Card>
              <Card className="p-5">
                <div className="type-eyebrow-sm">Volunteers</div>
                <div className="type-display mt-2 text-4xl text-text">
                  <CountUp value={latest.total_volunteers} />
                </div>
                <div className="mt-1 text-[13px] text-muted">contributed</div>
              </Card>
            </div>
          )}
          {chart.length > 1 && (
            <ChartCard title="Hours per report">
              <Bars data={chart} x="period" y="hours" unit=" h" height={200} />
            </ChartCard>
          )}
        </div>
      </div>

      <h2 className="type-title mb-4 mt-10 text-lg text-text">All reports</h2>
      {reports.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : reports.error ? (
        <ErrorState error={reports.error} onRetry={() => reports.refetch()} />
      ) : !reports.data?.length ? (
        <EmptyState icon={<FileSpreadsheet />} title="No reports yet" description="Generate your first report above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Volunteers</th>
                <th className="px-5 py-3 font-medium">Hours</th>
                <th className="px-5 py-3 font-medium">Generated</th>
                <th className="px-5 py-3 text-right font-medium">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reports.data.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3.5 font-medium text-text">
                    {r.period} {r.status !== 'completed' && <Badge size="sm">{r.status}</Badge>}
                  </td>
                  <td className="type-data px-5 py-3.5 text-text">{formatNumber(r.total_volunteers)}</td>
                  <td className="type-data px-5 py-3.5 text-text">{formatHours(r.total_hours)}</td>
                  <td className="px-5 py-3.5 text-muted">{formatDate(r.created_at, 'd MMM yyyy')}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="xs" variant="secondary" loading={exporting === r.id} onClick={() => exportCsv(r.id, r.period)}>
                      <Download /> CSV
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
