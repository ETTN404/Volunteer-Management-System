<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateCertificateRequest;
use App\Http\Resources\CertificateResource;
use App\Models\Certificate;
use App\Models\Volunteer;
use App\Services\CertificateService;

class CertificateController extends Controller
{
    public function __construct(private CertificateService $certificateService) {}

    public function generateCertificate(GenerateCertificateRequest $request)
    {
        $volunteer = Volunteer::query()->engagedWith(auth()->user()->org_id)->with('user')->findOrFail($request->volunteer_id);

        try {
            $certificate = $this->certificateService->generate($volunteer, (float) $request->milestone_hours, auth()->user()->org_id);

            return response()->json([
                'status'  => 'success',
                'message' => 'Certificate generated successfully.',
                'data'    => new CertificateResource($certificate),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /** G26 — always a real PDF, rendered from the record. */
    public function downloadCertificate($certificateId)
    {
        $certificate = Certificate::withoutGlobalScopes()
            ->where('volunteer_id', auth()->user()->volunteer?->id)
            ->findOrFail($certificateId);

        $number = $this->certificateService->number($certificate);

        return response($this->certificateService->pdf($certificate), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $number . '.pdf"',
        ]);
    }

    /** Public verification — exact certificate number match, masked name. */
    public function verifyCertificate(string $certificateNumber)
    {
        $number = strtoupper(trim($certificateNumber));
        $query  = Certificate::withoutGlobalScopes()->with(['volunteer.user', 'organization']);

        $certificate = (clone $query)->where('certificate_number', $number)->first();
        if (!$certificate && preg_match('/^VMS-0*(\d+)$/', $number, $m)) {
            $certificate = (clone $query)->whereNull('certificate_number')->find((int) $m[1]);
        }

        if (!$certificate) {
            return response()->json([
                'status'  => 'error',
                'valid'   => false,
                'message' => 'Invalid or unverified certificate number.',
            ], 404);
        }

        $volunteerName = $certificate->volunteer?->user?->full_name ?? 'Verified Volunteer';
        $nameParts  = preg_split('/\s+/', trim($volunteerName));
        $maskedName = $nameParts[0] . (isset($nameParts[1]) ? ' ' . mb_strtoupper(mb_substr($nameParts[1], 0, 1)) . '.' : '');

        return response()->json([
            'status' => 'success',
            'valid'  => true,
            'data'   => [
                'certificate_number' => $this->certificateService->number($certificate),
                'volunteer_name'     => $maskedName,
                'organization_name'  => $certificate->organization?->name ?? 'VolunTrack Platform',
                'milestone_hours'    => (float) $certificate->milestone_hours,
                'issued_date'        => $certificate->issued_date?->toDateString(),
                'verified_at'        => now()->toIso8601String(),
            ],
        ]);
    }
}
