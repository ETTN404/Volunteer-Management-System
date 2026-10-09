import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';

interface ReportJob {
  id: string;
  type: string;
  created_at: string;
  status: 'processing' | 'completed';
  download_url?: string;
  records_count?: number;
}

export const ReportsCenter: React.FC = () => {
  const [reportType, setReportType] = useState('attendance_summary');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [jobs, setJobs] = useState<ReportJob[]>([
    {
      id: 'REP-2026-0811',
      type: 'Volunteer Service Hours & Impact Audit',
      created_at: '2026-08-25 14:30:00',
      status: 'completed',
      download_url: '#',
      records_count: 142,
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTriggerReport = async () => {
    setIsGenerating(true);

    const newJobId = `REP-${Date.now().toString().slice(-6)}`;
    const newJob: ReportJob = {
      id: newJobId,
      type: reportType === 'attendance_summary' ? 'Attendance & Geofence Verification CSV' : 'Volunteer Roster & Skill Matrix CSV',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'processing',
    };

    setJobs((prev) => [newJob, ...prev]);

    // Simulate async job worker (§15.2 Async Export Job)
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJobId
            ? {
                ...j,
                status: 'completed',
                download_url: '#',
                records_count: 88,
              }
            : j
        )
      );
      setIsGenerating(false);
    }, 2000);
  };

  const handleDownloadCsv = (job: ReportJob) => {
    const csvContent =
      'data:text/csv;charset=utf-8,Volunteer_Name,Shift_Title,Check_In_Time,Check_Out_Time,Verified_Hours,Geofence_Status,Impact_Points\n' +
      'Sarah Chen,Morning Food Distribution,2026-08-28 08:02:11,2026-08-28 12:00:00,4.0,Verified_Within_12m,5.4\n' +
      'Marcus Johnson,Elderly Companionship,2026-08-28 13:00:00,2026-08-28 17:00:00,4.0,Verified_Within_8m,4.8\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${job.id}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              REPORTING & DATA EXPORT SUBSYSTEM (§15)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              CSV ASYNC WORKER
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Generate background CSV exports for municipal compliance audits, grant disclosures, and donor reporting.
          </p>
        </div>
      </div>

      {/* Export Configuration Card (High Density) */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 space-y-3">
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase">CONFIGURE ASYNC CSV EXPORT</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300">DATASET SCOPE:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="attendance_summary">Attendance & Geofence GPS Audit Records</option>
              <option value="volunteer_roster">Volunteer Competencies & Milestone Matrix</option>
              <option value="hours_aggregate">Monthly Hours Aggregate by Event Category</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300">DATE FILTER WINDOW:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="last_30_days">Current Month (Last 30 Days)</option>
              <option value="quarter_to_date">Quarter to Date (Q3 2026)</option>
              <option value="year_to_date">Annual Fiscal Year (YTD 2026)</option>
              <option value="all_time">Lifetime Organization History</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleTriggerReport}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center gap-1.5"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
            <span>{isGenerating ? 'ENQUEUING WORKER...' : 'QUEUE ASYNC EXPORT'}</span>
          </button>
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          EXPORT HISTORY & DOWNLOAD QUEUE
        </span>

        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{job.type}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                      {job.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>GENERATED: {job.created_at}</span>
                    {job.records_count && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400">{job.records_count} ROWS</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {job.status === 'processing' ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>PROCESSING...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownloadCsv(job)}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-colors"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>DOWNLOAD CSV</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
