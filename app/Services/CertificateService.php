<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Volunteer;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class CertificateService
{
    /**
     * Generate a milestone certificate PDF for a volunteer.
     *
     * This method:
     *  1. Validates that the volunteer's hours meet the milestone threshold
     *  2. Guards against duplicate certificate generation
     *  3. Renders and persists the PDF to storage/certificates/
     *  4. Creates the Certificate DB record and returns it
     *
     * @param Volunteer $volunteer
     * @param float     $milestoneHours  The milestone threshold being certified
     * @param int       $issuedByOrgId   The org ID issuing this certificate
     * @return Certificate
     *
     * @throws \InvalidArgumentException If hours are insufficient or duplicate
     */
    public function generate(Volunteer $volunteer, float $milestoneHours, int $issuedByOrgId): Certificate
    {
        // Guard: hours must meet the threshold
        if ($volunteer->total_hours < $milestoneHours) {
            throw new \InvalidArgumentException(
                "Volunteer has only logged {$volunteer->total_hours} hours, which does not meet the {$milestoneHours}-hour milestone threshold."
            );
        }

        // Guard: duplicate certificate check
        $existing = Certificate::where('volunteer_id', $volunteer->id)
            ->where('milestone_hours', $milestoneHours)
            ->first();

        if ($existing) {
            return $existing; // idempotent — safe to re-request the same milestone
        }

        $user             = $volunteer->user;
        $orgName          = $user->organization->name ?? 'VolunTrack Platform';
        $certificateNumber = 'VMS-' . strtoupper(bin2hex(random_bytes(4)));

        $templateData = [
            'volunteer_name'    => $user->full_name,
            'organization_name' => $orgName,
            'milestone_hours'   => $milestoneHours,
            'date'              => Carbon::now()->format('F d, Y'),
            'certificate_number' => $certificateNumber,
        ];

        // Render PDF to disk
        $filePath = $this->renderPdf($volunteer->id, $milestoneHours, $templateData);

        // Create and return the DB record
        return Certificate::create([
            'volunteer_id'    => $volunteer->id,
            'org_id'          => $issuedByOrgId,
            'issued_date'     => Carbon::now()->toDateString(),
            'milestone_hours' => $milestoneHours,
            'file_path'       => 'storage/' . $filePath,
        ]);
    }

    /**
     * Render the certificate PDF and save it to storage.
     * Falls back to a plaintext placeholder if DomPDF fails.
     *
     * @param int   $volunteerId
     * @param float $milestoneHours
     * @param array $data  Template variables
     * @return string Relative file path (under storage/public/)
     */
    private function renderPdf(int $volunteerId, float $milestoneHours, array $data): string
    {
        Storage::makeDirectory('public/certificates');

        $fileName = "certificate_{$volunteerId}_{$milestoneHours}h.pdf";
        $filePath = "certificates/{$fileName}";

        try {
            $pdf = Pdf::loadHTML($this->buildHtmlTemplate($data))->setPaper('a4', 'landscape');
            Storage::put('public/' . $filePath, $pdf->output());
        } catch (\Exception $e) {
            // Graceful fallback — stores placeholder so the record is still valid
            Storage::put('public/' . $filePath, "CERTIFICATE_PLACEHOLDER:{$data['volunteer_name']}:{$milestoneHours}h");
        }

        return $filePath;
    }

    /**
     * Build the HTML string used to render the PDF certificate.
     *
     * @param array $data Template variables
     * @return string HTML content
     */
    private function buildHtmlTemplate(array $data): string
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
                .cert-number { font-size: 12px; color: #a1a09a; margin-top: 5px; }
                .footer { margin-top: 50px; font-size: 14px; color: #a1a09a; }
            </style>
        </head>
        <body>
            <h1>CERTIFICATE OF APPRECIATION</h1>
            <h2>Proudly Presented To</h2>
            <div class='name'>{$data['volunteer_name']}</div>
            <p class='hours'>In recognition of their outstanding service and dedication of</p>
            <h3>{$data['milestone_hours']} Hours of Verified Community Service</h3>
            <p>contributed to the betterment of our community through <strong>{$data['organization_name']}</strong>.</p>
            <div class='footer'>
                <p>Issued on {$data['date']}</p>
                <p class='cert-number'>Certificate No: {$data['certificate_number']}</p>
            </div>
        </body>
        </html>";
    }
}
