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

        // Generate CSV Data
        $csvContent = "SaaS Impact Report,Period: " . $request->period . "\n";
        $csvContent .= "Generated At," . Carbon::now()->toDateTimeString() . "\n";
        $csvContent .= "Total Active Volunteers," . $totalVolunteers . "\n";
        $csvContent .= "Total Logged Service Hours," . $totalHours . "\n";

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
            'message' => 'Impact report compiled successfully.',
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
