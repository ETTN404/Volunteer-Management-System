<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateCertificateRequest;
use App\Models\Certificate;
use App\Models\Volunteer;
use App\Services\CertificateService;
use Illuminate\Support\Facades\Storage;

class CertificateController extends Controller
{
    public function __construct(private CertificateService $certificateService) {}
    /**
     * Generate a milestone certificate of appreciation for a volunteer.
     */
    public function generateCertificate(GenerateCertificateRequest $request)
    {
        $volunteer = Volunteer::with('user')->findOrFail($request->volunteer_id);

        try {
            $certificate = $this->certificateService->generate(
                $volunteer,
                (float) $request->milestone_hours,
                auth()->user()->org_id
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Certificate generated successfully.',
                'data'    => $certificate
            ], 201);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Download an existing certificate.
     */
    public function downloadCertificate($certificateId)
    {
        $certificate = Certificate::findOrFail($certificateId);

        // TenantScope automatically verifies organization boundaries.
        $storagePath = str_replace('storage/', 'public/', $certificate->file_path);

        if (!Storage::exists($storagePath)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Certificate file does not exist on disk.'
            ], 404);
        }

        return Storage::download($storagePath);
    }

    /**
     * Public Certificate Verification (Task 20 / Docs §14.4)
     * Publicly accessible by employers/universities to verify certificate authenticity.
     * Never exposes full PII or sensitive volunteer details.
     */
    public function verifyCertificate(string $certificateNumber)
    {
        $certificate = Certificate::withoutGlobalScopes()
            ->with(['volunteer.user', 'organization'])
            ->where('file_path', 'LIKE', "%{$certificateNumber}%")
            ->orWhere('id', (int) str_replace('VMS-', '', $certificateNumber))
            ->first();

        if (!$certificate) {
            return response()->json([
                'status'  => 'error',
                'valid'   => false,
                'message' => 'Invalid or unverified certificate number.',
            ], 404);
        }

        $volunteerName = $certificate->volunteer?->user?->full_name ?? 'Verified Volunteer';
        // Mask full name: "Jane Doe" -> "Jane D."
        $nameParts = explode(' ', $volunteerName);
        $maskedName = $nameParts[0] . (isset($nameParts[1]) ? ' ' . strtoupper(substr($nameParts[1], 0, 1)) . '.' : '');

        return response()->json([
            'status' => 'success',
            'valid'  => true,
            'data'   => [
                'certificate_number' => $certificateNumber,
                'volunteer_name'     => $maskedName,
                'organization_name'  => $certificate->organization?->name ?? 'VolunTrack Platform',
                'milestone_hours'    => (float) $certificate->milestone_hours,
                'issued_date'        => $certificate->issued_date,
                'verified_at'        => now()->toIso8601String(),
            ],
        ]);
    }
}

