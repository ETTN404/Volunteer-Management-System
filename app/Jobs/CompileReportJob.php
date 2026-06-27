<?php

namespace App\Jobs;

use App\Models\Report;
use App\Models\Volunteer;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Task 10.1.2.2: Queued Job for CSV Impact Report Compilation
 * Offloads the heavy data aggregation and file generation
 * to a background worker. Fires a log entry when complete.
 */
class CompileReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $backoff = 15;

    protected int $orgId;
    protected int $generatedById;
    protected string $period;

    /**
     * Create a new job instance.
     */
    public function __construct(int $orgId, int $generatedById, string $period)
    {
        $this->orgId = $orgId;
        $this->generatedById = $generatedById;
        $this->period = $period;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // 1. Aggregate Metrics
        $totalVolunteers = User::where('org_id', $this->orgId)->where('role', 'Volunteer')->count();

        $totalHours = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $this->orgId)
            ->sum('volunteers.total_hours');

        // 2. Build CSV with Anonymized PII
        $fileName = 'impact_report_' . $this->orgId . '_' . str_replace(' ', '_', $this->period) . '.csv';
        $filePath = 'reports/' . $fileName;

        Storage::makeDirectory('public/reports');

        $csvContent = "SaaS Impact Report,Period: " . $this->period . "\n";
        $csvContent .= "Generated At," . Carbon::now()->toDateTimeString() . "\n";
        $csvContent .= "Total Active Volunteers," . $totalVolunteers . "\n";
        $csvContent .= "Total Logged Service Hours," . $totalHours . "\n\n";

        $csvContent .= "Volunteer ID,Anonymized Name,Masked Email,Hours Served,Impact Score\n";

        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $this->orgId)
            ->select('volunteers.id', 'users.full_name', 'users.email', 'volunteers.total_hours', 'volunteers.impact_score')
            ->get();

        foreach ($volunteers as $vol) {
            $anonName = 'VOL-' . strtoupper(substr(md5($vol->full_name . $vol->id), 0, 6));
            $emailParts = explode('@', $vol->email);
            $maskedEmail = substr($emailParts[0], 0, 2) . '****@' . ($emailParts[1] ?? 'unknown');

            $csvContent .= "{$vol->id},{$anonName},{$maskedEmail},{$vol->total_hours},{$vol->impact_score}\n";
        }

        Storage::put('public/' . $filePath, $csvContent);

        // 3. Persist Report Record
        Report::create([
            'org_id' => $this->orgId,
            'generated_by' => $this->generatedById,
            'period' => $this->period,
            'total_volunteers' => $totalVolunteers,
            'total_hours' => $totalHours,
            'file_path' => 'storage/' . $filePath,
        ]);

        Log::info("Background report compiled for org {$this->orgId}, period: {$this->period}. File: {$filePath}");
    }
}
