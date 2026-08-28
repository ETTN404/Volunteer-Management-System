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
}

