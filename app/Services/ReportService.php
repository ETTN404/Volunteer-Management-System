<?php

namespace App\Services;

use App\Models\Report;
use App\Models\User;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class ReportService
{
    /**
     * Compile a full impact report CSV for an organization and persist it to disk.
     *
     * PII Anonymization rules (from Documentation.md §3.5.8):
     *  - Volunteer name → VOL-XXXXXX hashed identifier
     *  - Email → fi****@domain.com masked format
     *  - Never exports: passwords, raw GPS coordinates, signature files, biographies
     *
     * @param int    $orgId       The organization to generate the report for
     * @param int    $generatedBy User ID of the coordinator who triggered this
     * @param string $period      Human-readable period label (e.g. "Q1 2026")
     * @return Report             The newly created Report database record
     */
    public function compile(int $orgId, int $generatedBy, string $period): Report
    {
        // 1. Aggregate metrics
        $totalVolunteers = User::where('org_id', $orgId)
            ->where('role', 'Volunteer')
            ->count();

        $totalHours = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $orgId)
            ->sum('volunteers.total_hours');

        // 2. Build CSV content with anonymized volunteer details
        $csvContent = $this->buildCsvContent($orgId, $period, $totalVolunteers, $totalHours);

        // 3. Write to storage
        $filePath = $this->persistToDisk($orgId, $period, $csvContent);

        // 4. Create and return the Report record with status
        return Report::create([
            'org_id'           => $orgId,
            'generated_by'     => $generatedBy,
            'period'           => $period,
            'total_volunteers' => $totalVolunteers,
            'total_hours'      => $totalHours,
            'status'           => 'completed',
            'file_path'        => 'storage/' . $filePath,
        ]);
    }

    /**
     * Build the anonymized CSV report string.
     *
     * @param int    $orgId
     * @param string $period
     * @param int    $totalVolunteers
     * @param float  $totalHours
     * @return string
     */
    private function buildCsvContent(int $orgId, string $period, int $totalVolunteers, float $totalHours): string
    {
        $lines = [
            "VolunTrack Impact Report,Period: {$period}",
            "Generated At," . Carbon::now()->toDateTimeString(),
            "Organization ID,{$orgId}",
            "Total Active Volunteers,{$totalVolunteers}",
            "Total Logged Service Hours,{$totalHours}",
            "",
            "Volunteer ID,Anonymized Identifier,Masked Email,Total Hours,Impact Score",
        ];

        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $orgId)
            ->select('volunteers.id', 'users.full_name', 'users.email', 'volunteers.total_hours', 'volunteers.impact_score')
            ->get();

        foreach ($volunteers as $vol) {
            $lines[] = implode(',', [
                $vol->id,
                $this->anonymizeName($vol->full_name, $vol->id),
                $this->maskEmail($vol->email),
                $vol->total_hours,
                $vol->impact_score,
            ]);
        }

        return implode("\n", $lines);
    }

    /**
     * Write CSV content to the storage/public/reports directory.
     *
     * @param int    $orgId
     * @param string $period
     * @param string $csvContent
     * @return string Relative file path
     */
    private function persistToDisk(int $orgId, string $period, string $csvContent): string
    {
        Storage::makeDirectory('public/reports');

        $safePeriod = str_replace([' ', '/'], '_', $period);
        $fileName   = "impact_report_{$orgId}_{$safePeriod}.csv";
        $filePath   = "reports/{$fileName}";

        Storage::put('public/' . $filePath, $csvContent);

        return $filePath;
    }

    /**
     * Anonymize a volunteer name to a VOL-XXXXXX identifier.
     * The hash is deterministic per volunteer ID so report diffs are comparable.
     *
     * @param string $name
     * @param int    $id
     * @return string
     */
    private function anonymizeName(string $name, int $id): string
    {
        return 'VOL-' . strtoupper(substr(md5($name . $id), 0, 6));
    }

    /**
     * Mask a volunteer email address — show first 2 characters then asterisks.
     * Example: jane.doe@example.com → ja****@example.com
     *
     * @param string $email
     * @return string
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        $local = $parts[0] ?? '';
        $domain = $parts[1] ?? 'unknown';

        return substr($local, 0, 2) . '****@' . $domain;
    }
}
