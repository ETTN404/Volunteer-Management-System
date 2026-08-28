<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateReportRequest;
use App\Jobs\CompileReportJob;
use App\Models\Report;
use App\Services\ReportService;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}
    /**
     * Generate an analytical organization-level impact report for donors/stakeholders.
     */
    public function generateReport(GenerateReportRequest $request)
    {
        $orgId       = auth()->user()->org_id;
        $generatedBy = auth()->id();
        $period      = $request->period;

        if ($request->boolean('async')) {
            CompileReportJob::dispatch($orgId, $generatedBy, $period);

            return response()->json([
                'status'  => 'success',
                'message' => 'Impact report compilation queued in background worker. PII will be anonymized.',
            ], 202);
        }

        $report = $this->reportService->compile($orgId, $generatedBy, $period);

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
