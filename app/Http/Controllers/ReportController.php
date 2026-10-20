<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateReportRequest;
use App\Http\Resources\ReportResource;
use App\Jobs\CompileReportJob;
use App\Models\Organization;
use App\Models\Report;
use App\Services\PlanService;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService, private PlanService $plans) {}

    public function generateReport(GenerateReportRequest $request)
    {
        $orgId = auth()->user()->org_id;

        if ($request->boolean('async')) {
            CompileReportJob::dispatch($orgId, auth()->id(), $request->period);
            return response()->json(['status' => 'success', 'message' => 'Impact report compilation queued. PII will be anonymized.'], 202);
        }

        $report = $this->reportService->compile($orgId, auth()->id(), $request->period, $request->from, $request->to);

        return response()->json([
            'status'  => 'success',
            'message' => 'Impact report compiled successfully. PII has been anonymized.',
            'data'    => new ReportResource($report),
        ], 201);
    }

    public function getReports()
    {
        return response()->json(['status' => 'success', 'data' => ReportResource::collection(Report::orderByDesc('created_at')->get())]);
    }

    public function showReport($id)
    {
        return response()->json(['status' => 'success', 'data' => new ReportResource(Report::findOrFail($id))]);
    }

    public function deleteReport($id)
    {
        Report::findOrFail($id)->delete();
        return response()->json(['status' => 'success', 'message' => 'Report deleted.']);
    }

    /** G27 — CSV (all plans) or PDF (plans with reports_export). */
    public function export(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $format = $request->query('format', 'csv');
        $name   = 'impact-report-' . preg_replace('/[^A-Za-z0-9_-]/', '_', $report->period) . '-' . $report->id;

        if ($format === 'pdf') {
            $this->plans->ensureFeature(Organization::findOrFail($report->org_id), 'reports_export');
            return Pdf::loadHTML($this->reportService->html($report))->setPaper('a4')->download($name . '.pdf');
        }

        return response($this->reportService->csv($report), 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $name . '.csv"',
        ]);
    }
}
