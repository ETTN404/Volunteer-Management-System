<?php

namespace App\Jobs;

use App\Models\Volunteer;
use App\Services\CertificateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queued Job for PDF Certificate Generation
 * Offloads heavy DomPDF rendering and disk storage to a background worker.
 */
class GenerateCertificateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $volunteerId,
        public float $milestoneHours,
        public int $orgId
    ) {}

    /**
     * Execute the job using CertificateService.
     */
    public function handle(CertificateService $certificateService): void
    {
        $volunteer = Volunteer::findOrFail($this->volunteerId);

        try {
            $certificate = $certificateService->generate(
                $volunteer,
                $this->milestoneHours,
                $this->orgId
            );

            Log::info("GenerateCertificateJob: Certificate #{$certificate->id} generated for volunteer #{$this->volunteerId} ({$this->milestoneHours}h milestone).");
        } catch (\Exception $e) {
            Log::error("GenerateCertificateJob failed for volunteer #{$this->volunteerId}: " . $e->getMessage());
            throw $e;
        }
    }
}
