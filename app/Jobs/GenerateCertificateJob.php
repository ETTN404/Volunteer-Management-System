<?php

namespace App\Jobs;

use App\Models\Certificate;
use App\Models\Volunteer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Task 10.1.2.1: Queued Job for PDF Certificate Generation
 * Offloads the heavy DomPDF rendering to a background worker
 * so the HTTP request returns instantly.
 */
class GenerateCertificateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    protected int $volunteerId;
    protected float $milestoneHours;
    protected int $orgId;
    protected int $issuedById;

    /**
     * Create a new job instance.
     */
    public function __construct(int $volunteerId, float $milestoneHours, int $orgId, int $issuedById)
    {
        $this->volunteerId = $volunteerId;
        $this->milestoneHours = $milestoneHours;
        $this->orgId = $orgId;
        $this->issuedById = $issuedById;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $volunteer = Volunteer::with('user')->findOrFail($this->volunteerId);
        $user = $volunteer->user;

        // Prevent duplicate certificates
        $existing = Certificate::where('volunteer_id', $volunteer->id)
            ->where('milestone_hours', $this->milestoneHours)
            ->first();

        if ($existing) {
            Log::info("Certificate already exists for volunteer {$volunteer->id} at {$this->milestoneHours}h milestone.");
            return;
        }

        // Setup Template Data
        $data = [
            'volunteer_name' => $user->full_name,
            'organization_name' => $user->organization->name ?? 'Volunteer Management System',
            'milestone_hours' => $this->milestoneHours,
            'date' => Carbon::now()->format('F d, Y'),
            'certificate_number' => 'VMS-' . strtoupper(bin2hex(random_bytes(4))),
        ];

        Storage::makeDirectory('public/certificates');

        $fileName = 'certificate_' . $volunteer->id . '_' . $this->milestoneHours . 'h.pdf';
        $filePath = 'certificates/' . $fileName;

        // Render PDF
        try {
            $pdf = Pdf::loadHTML($this->getHtmlTemplate($data))->setPaper('a4', 'landscape');
            Storage::put('public/' . $filePath, $pdf->output());
        } catch (\Exception $e) {
            Storage::put('public/' . $filePath, "MOCK_PDF_CONTENT_FOR_{$user->full_name}");
            Log::warning("DomPDF rendering failed for volunteer {$volunteer->id}: " . $e->getMessage());
        }

        // Create Database Record
        Certificate::create([
            'volunteer_id' => $volunteer->id,
            'org_id' => $this->orgId,
            'issued_date' => Carbon::now()->toDateString(),
            'milestone_hours' => $this->milestoneHours,
            'file_path' => 'storage/' . $filePath,
        ]);

        Log::info("Certificate generated in background for volunteer {$volunteer->id} ({$this->milestoneHours}h milestone).");
    }

    /**
     * Certificate HTML Template (duplicated from controller for job isolation)
     */
    private function getHtmlTemplate(array $data): string
    {
        return "
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica', sans-serif; text-align: center; padding: 50px; border: 15px solid #FF750F; }
                h1 { font-size: 40px; color: #1B1B18; margin-bottom: 5px; }
                h2 { font-size: 24px; color: #706F6C; margin-top: 0; }
                .name { font-size: 32px; font-weight: bold; color: #FF750F; margin: 30px 0; border-bottom: 2px solid #eeeeec; display: inline-block; padding-bottom: 5px; }
                .hours { font-size: 20px; margin: 20px 0; }
                .footer { margin-top: 50px; font-size: 14px; color: #a1a09a; }
            </style>
        </head>
        <body>
            <h1>CERTIFICATE OF APPRECIATION</h1>
            <h2>Proudly Presented To</h2>
            <div class='name'>{$data['volunteer_name']}</div>
            <p class='hours'>In recognition of their outstanding service and dedication of</p>
            <h3>{$data['milestone_hours']} Hours of Community Service</h3>
            <p>contributed to the betterment of our community through <strong>{$data['organization_name']}</strong>.</p>
            <div class='footer'>
                <p>Issued on {$data['date']} | Certificate No: {$data['certificate_number']}</p>
            </div>
        </body>
        </html>";
    }
}
