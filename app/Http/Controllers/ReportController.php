<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\Volunteer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Generate an analytical organization-level impact report for donors/stakeholders.
     */
    public function generateReport(Request $request)
    {
        $request->validate([
            'period' => 'required|string|max:50',
        ]);

        $orgId = auth()->user()->org_id;

        // 1. Aggregate Real Database Metrics
        $totalVolunteers = User::where('org_id', $orgId)->where('role', 'Volunteer')->count();
        
        $totalHours = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $orgId)
            ->sum('volunteers.total_hours');

        // 2. Setup Export Storage File
        $fileName = 'impact_report_' . $orgId . '_' . str_replace(' ', '_', $request->period) . '.csv';
        $filePath = 'reports/' . $fileName;

        Storage::makeDirectory('public/reports');

        // Generate CSV Data with anonymized PII (Task 9.2.2.2)
        $csvContent = "SaaS Impact Report,Period: " . $request->period . "\n";
        $csvContent .= "Generated At," . Carbon::now()->toDateTimeString() . "\n";
        $csvContent .= "Total Active Volunteers," . $totalVolunteers . "\n";
        $csvContent .= "Total Logged Service Hours," . $totalHours . "\n\n";

        // Per-volunteer breakdown with anonymized identifiers
        $csvContent .= "Volunteer ID,Anonymized Name,Masked Email,Hours Served,Impact Score\n";

        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $orgId)
            ->select('volunteers.id', 'users.full_name', 'users.email', 'volunteers.total_hours', 'volunteers.impact_score')
            ->get();

        foreach ($volunteers as $vol) {
            // Anonymize: hash the name to a short identifier
            $anonName = 'VOL-' . strtoupper(substr(md5($vol->full_name . $vol->id), 0, 6));
            // Mask email: show first 2 chars + domain
            $emailParts = explode('@', $vol->email);
            $maskedEmail = substr($emailParts[0], 0, 2) . '****@' . ($emailParts[1] ?? 'unknown');

            $csvContent .= "{$vol->id},{$anonName},{$maskedEmail},{$vol->total_hours},{$vol->impact_score}\n";
        }

        Storage::put('public/' . $filePath, $csvContent);

        // 3. Save Report Record
        $report = Report::create([
            'org_id' => $orgId,
            'generated_by' => auth()->user()->id,
            'period' => $request->period,
            'total_volunteers' => $totalVolunteers,
            'total_hours' => $totalHours,
            'file_path' => 'storage/' . $filePath,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Impact report compiled successfully. PII has been anonymized.',
            'data' => $report
        ], 201);
    }

    /**
     * Get all generated reports.
     */
    public function getReports()
    {
        $reports = Report::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $reports
        ]);
    }
}
