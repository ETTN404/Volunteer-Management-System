<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Organization;
use App\Models\Volunteer;
use App\Notifications\CertificateIssuedNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Milestone certificates (UC-19). The PDF is rendered on demand from the
 * database record, so it survives container restarts; a copy is written to
 * disk best-effort for fast downloads.
 */
class CertificateService
{
    /**
     * @throws \InvalidArgumentException If hours are insufficient
     */
    public function generate(Volunteer $volunteer, float $milestoneHours, int $issuedByOrgId): Certificate
    {
        if ($volunteer->total_hours < $milestoneHours) {
            throw new \InvalidArgumentException(
                "Volunteer has only logged {$volunteer->total_hours} hours, which does not meet the {$milestoneHours}-hour milestone threshold."
            );
        }

        $existing = Certificate::withoutGlobalScopes()
            ->where('volunteer_id', $volunteer->id)
            ->where('milestone_hours', $milestoneHours)
            ->first();
        if ($existing) {
            return $existing; // idempotent
        }

        $certificate = Certificate::withoutGlobalScopes()->create([
            'volunteer_id'    => $volunteer->id,
            'org_id'          => $issuedByOrgId,
            'issued_date'     => Carbon::now()->toDateString(),
            'milestone_hours' => $milestoneHours,
            'file_path'       => '',
        ]);
        $number = 'VMS-' . str_pad((string) $certificate->id, 5, '0', STR_PAD_LEFT);
        $certificate->update(['certificate_number' => $number]);

        $filePath = $this->renderToDisk($certificate);
        $certificate->update(['file_path' => 'storage/' . $filePath]);

        if ($volunteer->user) {
            app(Notifier::class)->send($volunteer->user, new CertificateIssuedNotification($certificate));
        }

        return $certificate;
    }

    public function number(Certificate $certificate): string
    {
        return $certificate->certificate_number ?: 'VMS-' . str_pad((string) $certificate->id, 5, '0', STR_PAD_LEFT);
    }

    public function templateData(Certificate $certificate): array
    {
        $volunteer = Volunteer::with('user')->find($certificate->volunteer_id);
        $org       = Organization::find($certificate->org_id);
        $number    = $this->number($certificate);
        $base      = app(FrontendUrl::class)->base();

        return [
            'volunteer_name'     => $volunteer?->user?->full_name ?? 'Volunteer',
            'organization_name'  => $org?->name ?? 'VolunTrack Platform',
            'milestone_hours'    => rtrim(rtrim(number_format((float) $certificate->milestone_hours, 2), '0'), '.'),
            'date'               => Carbon::parse($certificate->issued_date)->format('F d, Y'),
            'certificate_number' => $number,
            'verify_url'         => ($base ? $base : 'https://voluntrack') . '/verify/' . $number,
            'color'              => $org?->primary_color ?: '#3341B8',
        ];
    }

    /** PDF bytes, rendered from the record. */
    public function pdf(Certificate $certificate): string
    {
        return Pdf::loadHTML($this->buildHtmlTemplate($this->templateData($certificate)))->setPaper('a4', 'landscape')->output();
    }

    private function renderToDisk(Certificate $certificate): string
    {
        $filePath = "certificates/certificate_{$certificate->volunteer_id}_{$certificate->milestone_hours}h.pdf";
        try {
            Storage::makeDirectory('public/certificates');
            Storage::put('public/' . $filePath, $this->pdf($certificate));
        } catch (\Throwable $e) {
            Storage::put('public/' . $filePath, 'CERTIFICATE:' . $this->number($certificate));
        }
        return $filePath;
    }

    public function buildHtmlTemplate(array $data): string
    {
        $d = array_map(fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'), $data);

        return "
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                @page { margin: 0; }
                body { font-family: 'DejaVu Sans', sans-serif; margin: 0; color: #1f2333; }
                .frame { margin: 28px; border: 2px solid {$d['color']}; padding: 46px 60px; height: 470px; position: relative; }
                .band { height: 8px; background: {$d['color']}; margin: -46px -60px 36px; }
                .eyebrow { letter-spacing: 4px; font-size: 11px; color: #6b7080; text-transform: uppercase; }
                h1 { font-size: 34px; margin: 6px 0 22px; letter-spacing: 1px; }
                .name { font-size: 30px; font-weight: bold; color: {$d['color']}; margin: 10px 0 14px; }
                .lead { font-size: 14px; color: #4b5060; line-height: 1.6; }
                .hours { font-size: 22px; font-weight: bold; margin: 16px 0; }
                .foot { position: absolute; bottom: 40px; left: 60px; right: 60px; font-size: 11px; color: #6b7080; }
                .foot td { vertical-align: bottom; }
                .num { font-family: 'DejaVu Sans Mono', monospace; font-size: 12px; color: #1f2333; }
            </style>
        </head>
        <body>
          <div class='frame'>
            <div class='band'></div>
            <div class='eyebrow'>Certificate of appreciation</div>
            <h1>{$d['organization_name']}</h1>
            <div class='lead'>This certifies that</div>
            <div class='name'>{$d['volunteer_name']}</div>
            <div class='lead'>has contributed</div>
            <div class='hours'>{$d['milestone_hours']} hours of verified volunteer service</div>
            <div class='lead'>with {$d['organization_name']}. Thank you for showing up for your community.</div>
            <table class='foot' width='100%'><tr>
              <td>Issued {$d['date']}<br>Verified on VolunTrack</td>
              <td align='right'>Certificate No. <span class='num'>{$d['certificate_number']}</span><br>Verify at {$d['verify_url']}</td>
            </tr></table>
          </div>
        </body>
        </html>";
    }
}
