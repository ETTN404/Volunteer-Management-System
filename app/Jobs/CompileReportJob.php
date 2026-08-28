<?php

namespace App\Jobs;

use App\Services\ReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queued Job for CSV Impact Report Compilation
 * Offloads data aggregation, PII anonymization, and CSV generation to background queue.
 */
class CompileReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $backoff = 15;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $orgId,
        public int $generatedById,
        public string $period
    ) {}

    /**
     * Execute the job using ReportService.
     */
    public function handle(ReportService $reportService): void
    {
        try {
            $report = $reportService->compile(
                $this->orgId,
                $this->generatedById,
                $this->period
            );

            Log::info("CompileReportJob: Impact report #{$report->id} compiled for org #{$this->orgId}, period: {$this->period}.");
        } catch (\Exception $e) {
            Log::error("CompileReportJob failed for org #{$this->orgId}: " . $e->getMessage());
            throw $e;
        }
    }
}
