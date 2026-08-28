<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Services\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}
    /**
     * Generate an analytical organization-level impact report for donors/stakeholders.
     */
    public function generateReport(Request $request)
    {
        $request->validate([
            'period' => 'required|string|max:50',
        ]);

        $report = $this->reportService->compile(
            orgId:       auth()->user()->org_id,
            generatedBy: auth()->id(),
            period:      $request->period
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Impact report compiled successfully. PII has been anonymized.',
            'data'    => $report
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
