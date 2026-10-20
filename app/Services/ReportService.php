<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Report;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Organization impact reports for donors and boards.
 *
 * Counts only what this organization can prove: verified/adjusted hours on its
 * own shifts inside the reporting period. Volunteer identities are anonymized
 * (VOL-XXXXXX, masked email); no GPS, signatures or biographies are exported.
 */
class ReportService
{
    /** Resolve "Q1 2026", "2026-10", "2026" or explicit dates into a date range. */
    public function range(string $period, ?string $from = null, ?string $to = null): array
    {
        if ($from || $to) {
            return [Carbon::parse($from ?? '2000-01-01')->startOfDay(), Carbon::parse($to ?? now())->endOfDay()];
        }
        if (preg_match('/^Q([1-4])\s*(\d{4})$/i', trim($period), $m)) {
            $start = Carbon::create((int) $m[2], ((int) $m[1] - 1) * 3 + 1, 1)->startOfDay();
            return [$start, $start->copy()->addMonths(3)->subDay()->endOfDay()];
        }
        if (preg_match('/^(\d{4})-(\d{2})$/', trim($period), $m)) {
            $start = Carbon::create((int) $m[1], (int) $m[2], 1)->startOfDay();
            return [$start, $start->copy()->endOfMonth()];
        }
        if (preg_match('/^(\d{4})$/', trim($period), $m)) {
            return [Carbon::create((int) $m[1], 1, 1)->startOfDay(), Carbon::create((int) $m[1], 12, 31)->endOfDay()];
        }
        return [Carbon::create(2000, 1, 1), now()->endOfDay()];
    }

    public function compile(int $orgId, int $generatedBy, string $period, ?string $from = null, ?string $to = null): Report
    {
        [$start, $end] = $this->range($period, $from, $to);
        $summary = $this->summarize($orgId, $start, $end);

        $report = Report::withoutGlobalScopes()->create([
            'org_id'           => $orgId,
            'generated_by'     => $generatedBy,
            'period'           => $period,
            'period_start'     => $start->toDateString(),
            'period_end'       => $end->toDateString(),
            'total_volunteers' => $summary['volunteers'],
            'total_hours'      => $summary['verified_hours'],
            'summary'          => $summary,
            'status'           => 'completed',
            'file_path'        => '',
        ]);

        // Best-effort copy on disk (the export endpoint regenerates from the DB anyway).
        try {
            $path = 'reports/impact_report_' . $orgId . '_' . $report->id . '.csv';
            Storage::put('public/' . $path, $this->csv($report));
            $report->update(['file_path' => 'storage/' . $path]);
        } catch (\Throwable) {
        }

        return $report;
    }

    public function summarize(int $orgId, Carbon $start, Carbon $end): array
    {
        $shiftIds = Shift::query()->forOrg($orgId)->select('shifts.id');
        $att = Attendance::whereIn('shift_id', $shiftIds)->whereBetween('check_in_time', [$start, $end])
            ->with('shift.event')->get();
        $credited = fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : 0.0;

        $events = Event::withoutGlobalScopes()->where('org_id', $orgId)
            ->where('start_date', '<=', $end->toDateString())->where('end_date', '>=', $start->toDateString())->get();

        $byEvent = $events->map(function ($e) use ($att, $credited) {
            $rows = $att->filter(fn ($a) => $a->shift?->event_id === $e->id);
            $shifts = Shift::where('event_id', $e->id)->withCount(['shiftAssignments as confirmed_count' => fn ($q) => $q->where('status', 'confirmed')])->get();
            return [
                'event_id'       => $e->id,
                'title'          => $e->title,
                'status'         => $e->status,
                'start_date'     => $e->start_date?->toDateString(),
                'shifts'         => $shifts->count(),
                'places'         => (int) $shifts->sum('capacity'),
                'confirmed'      => (int) $shifts->sum('confirmed_count'),
                'volunteers'     => $rows->pluck('volunteer_id')->unique()->count(),
                'verified_hours' => round($rows->sum($credited), 2),
                'pending_hours'  => round($rows->where('hours_status', 'pending')->sum(fn ($a) => $a->rawHours()), 2),
            ];
        })->values();

        $byMonth = [];
        for ($m = $start->copy()->startOfMonth(); $m->lte($end) && count($byMonth) < 24; $m->addMonth()) {
            $key = $m->format('Y-m');
            $byMonth[] = ['month' => $key, 'hours' => round($att->filter(fn ($a) => $a->check_in_time->format('Y-m') === $key)->sum($credited), 2)];
        }

        $confirmedInPeriod = ShiftAssignment::whereIn('shift_id', Shift::query()->forOrg($orgId)->whereBetween('start_time', [$start, min($end, now())])->select('shifts.id'))
            ->where('status', 'confirmed')->count();

        return [
            'period_start'    => $start->toDateString(),
            'period_end'      => $end->toDateString(),
            'volunteers'      => $att->pluck('volunteer_id')->unique()->count(),
            'new_volunteers'  => ShiftAssignment::whereIn('shift_id', $shiftIds)->whereBetween('created_at', [$start, $end])->distinct('volunteer_id')->count('volunteer_id'),
            'verified_hours'  => round($att->sum($credited), 2),
            'pending_hours'   => round($att->where('hours_status', 'pending')->sum(fn ($a) => $a->rawHours()), 2),
            'shifts_worked'   => $att->pluck('shift_id')->unique()->count(),
            'attendances'     => $att->count(),
            'attendance_rate' => $confirmedInPeriod ? round(min(1, $att->count() / $confirmedInPeriod) * 100, 1) : null,
            'events'          => $events->count(),
            'by_event'        => $byEvent,
            'by_month'        => $byMonth,
            'top_volunteers'  => $att->groupBy('volunteer_id')->map(fn ($rows, $vid) => [
                'volunteer' => 'VOL-' . strtoupper(substr(md5('vol' . $vid), 0, 6)),
                'hours'     => round($rows->sum($credited), 2),
                'shifts'    => $rows->count(),
            ])->sortByDesc('hours')->take(10)->values(),
        ];
    }

    public function csv(Report $report): string
    {
        $s   = $report->summary ?? [];
        $org = Organization::find($report->org_id);
        $out = fopen('php://temp', 'r+');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['VolunTrack impact report']);
        fputcsv($out, ['Organization', $org?->name]);
        fputcsv($out, ['Period', $report->period, ($s['period_start'] ?? '') . ' to ' . ($s['period_end'] ?? '')]);
        fputcsv($out, ['Generated (UTC)', $report->created_at?->toDateTimeString()]);
        fputcsv($out, []);
        fputcsv($out, ['Volunteers who served', $s['volunteers'] ?? $report->total_volunteers]);
        fputcsv($out, ['Verified hours', $s['verified_hours'] ?? $report->total_hours]);
        fputcsv($out, ['Hours awaiting verification', $s['pending_hours'] ?? 0]);
        fputcsv($out, ['Shifts worked', $s['shifts_worked'] ?? 0]);
        fputcsv($out, ['Attendance rate (%)', $s['attendance_rate'] ?? '—']);
        fputcsv($out, []);
        fputcsv($out, ['Event', 'Status', 'Start date', 'Shifts', 'Places', 'Confirmed', 'Volunteers', 'Verified hours', 'Pending hours']);
        foreach ($s['by_event'] ?? [] as $e) {
            fputcsv($out, [$e['title'], $e['status'], $e['start_date'], $e['shifts'], $e['places'], $e['confirmed'], $e['volunteers'], $e['verified_hours'], $e['pending_hours']]);
        }
        fputcsv($out, []);
        fputcsv($out, ['Top volunteers (anonymized)', 'Hours', 'Shifts']);
        foreach ($s['top_volunteers'] ?? [] as $v) {
            fputcsv($out, [$v['volunteer'], $v['hours'], $v['shifts']]);
        }
        rewind($out);
        return stream_get_contents($out);
    }

    public function html(Report $report): string
    {
        $s   = $report->summary ?? [];
        $org = e(Organization::find($report->org_id)?->name ?? '');
        $rows = collect($s['by_event'] ?? [])->map(fn ($e) => '<tr><td>' . e($e['title']) . '</td><td>' . e($e['start_date']) . '</td><td class="n">' . $e['volunteers'] . '</td><td class="n">' . number_format($e['verified_hours'], 1) . '</td></tr>')->implode('');
        $kpi = fn ($label, $value) => '<td class="kpi"><div class="v">' . e((string) $value) . '</div><div class="l">' . e($label) . '</div></td>';

        return '<html><head><meta charset="utf-8"><style>
            body{font-family:DejaVu Sans,sans-serif;color:#111827;font-size:12px;margin:28px}
            h1{font-size:22px;margin:0}.muted{color:#6b7280}
            table{width:100%;border-collapse:collapse;margin-top:16px}
            th,td{padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:left}th{font-size:10px;text-transform:uppercase;color:#6b7280}
            .n{text-align:right}.kpi{border:1px solid #e5e7eb;padding:12px;width:25%}.kpi .v{font-size:20px;font-weight:bold;color:#3341b8}.kpi .l{font-size:10px;color:#6b7280}
            .bar{height:6px;background:linear-gradient(90deg,#3341b8,#ec6a3c);margin-bottom:18px}
        </style></head><body><div class="bar"></div>
        <h1>Impact report — ' . $org . '</h1>
        <div class="muted">' . e($report->period) . ' · ' . e(($s['period_start'] ?? '') . ' to ' . ($s['period_end'] ?? '')) . '</div>
        <table><tr>' . $kpi('Volunteers who served', $s['volunteers'] ?? 0) . $kpi('Verified hours', number_format($s['verified_hours'] ?? 0, 1))
            . $kpi('Shifts worked', $s['shifts_worked'] ?? 0) . $kpi('Attendance rate', isset($s['attendance_rate']) ? $s['attendance_rate'] . '%' : '—') . '</tr></table>
        <table><thead><tr><th>Event</th><th>Start</th><th class="n">Volunteers</th><th class="n">Verified hours</th></tr></thead><tbody>' . ($rows ?: '<tr><td colspan="4" class="muted">No events in this period.</td></tr>') . '</tbody></table>
        <p class="muted" style="margin-top:24px">Only coordinator-verified hours are counted. Volunteer identities are anonymized. Generated by VolunTrack on ' . e($report->created_at?->toDateTimeString()) . ' UTC.</p>
        </body></html>';
    }
}
