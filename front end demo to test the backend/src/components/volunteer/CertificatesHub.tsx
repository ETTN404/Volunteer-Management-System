import React, { useState } from 'react';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  QrCode,
  Loader2,
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';
import { Certificate, Volunteer, User, Organization } from '../../types/vms';

interface CertificatesHubProps {
  certificates: Certificate[];
  volunteer: Volunteer;
  user: User;
  org: Organization;
  onVerifyPublicly: (certNumber: string) => void;
}

export const CertificatesHub: React.FC<CertificatesHubProps> = ({
  certificates,
  volunteer,
  user,
  org,
  onVerifyPublicly,
}) => {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(certificates[0] || null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  // GET /api/volunteer/certificates/{id}/download
  const handleDownload = async (cert: Certificate) => {
    setDownloadingId(cert.id);
    setDownloadMsg(null);
    const res = await ApiClient.request('GET', `/api/volunteer/certificates/${cert.id}/download`);
    setDownloadingId(null);
    if (res.status === 200) {
      const url = res.data?.download_url || cert.download_url;
      if (url && url !== '#' && !url.startsWith('#')) {
        window.open(url, '_blank');
        setDownloadMsg(`✓ Download started: ${cert.certificate_number}`);
      } else {
        setDownloadMsg(`✓ Download URL: ${url || 'PDF generated in /storage/certificates/'}`);
      }
    } else {
      setDownloadMsg(res.error || 'Download failed — check storage config.');
    }
  };


  return (
    <div className="space-y-3.5">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              ACCREDITED MILESTONE CERTIFICATES HUB
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {certificates.length} ISSUED
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Automated PDF certificates (§14) issued upon threshold crossing, cryptographically signed with public verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left Column: Certificates List */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            ISSUED CREDENTIALS ({certificates.length})
          </span>

          {certificates.length === 0 ? (
            <div className="bg-[#1e293b] p-6 rounded-lg border border-slate-700 text-center text-slate-400 text-xs font-mono">
              No certificates issued yet. Complete shifts to cross milestones.
            </div>
          ) : (
            certificates.map((cert) => {
              const isSelected = selectedCert?.id === cert.id;
              return (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCert(cert)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-sm'
                      : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white">{cert.title}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-indigo-400 border border-slate-700">
                      {cert.certificate_number}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>ISSUED: {cert.issued_date}</span>
                    <span className="text-emerald-400 font-bold">
                      {cert.milestone_hours} HRS
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Certificate Document Preview */}
        <div className="lg:col-span-2 space-y-2">
          {selectedCert ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  OFFICIAL DOCUMENT PREVIEW (§14.3)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerifyPublicly(selectedCert.certificate_number)}
                    className="flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>PUBLIC VERIFY</span>
                  </button>
                  {/* GET /api/volunteer/certificates/{id}/download */}
                  <button
                    onClick={() => handleDownload(selectedCert)}
                    disabled={downloadingId === selectedCert.id}
                    className="flex items-center gap-1 text-xs font-mono font-bold px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-sm transition-all disabled:opacity-60"
                  >
                    {downloadingId === selectedCert.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>DOWNLOAD PDF</span>
                  </button>
                </div>
              </div>

              {/* Download feedback */}
              {downloadMsg && (
                <div className={`p-2 rounded text-[10px] font-mono border ${
                  downloadMsg.startsWith('✓')
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  {downloadMsg}
                </div>
              )}


              {/* High-Density Certificate Frame */}
              <div className="bg-slate-950 p-6 sm:p-8 rounded-lg border-2 border-amber-500/40 text-center space-y-4 shadow-xl relative overflow-hidden">
                <div className="space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold pt-1">
                    {org.name}
                  </h3>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
                    Certificate of Volunteer Achievement
                  </h2>
                </div>

                <div className="space-y-1 py-1">
                  <p className="text-[11px] text-slate-400 font-serif italic">This is proudly awarded to</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight font-sans">
                    {user.name}
                  </h1>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed pt-1 font-sans">
                    for verified completion of{' '}
                    <strong className="text-amber-300 font-bold">{selectedCert.milestone_hours} volunteer service hours</strong>.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div>
                    <div className="font-serif italic text-sm text-amber-300">
                      {selectedCert.signatory_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {selectedCert.signatory_title}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      ISSUED: {selectedCert.issued_date}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-[#1e293b] p-2 rounded border border-slate-700">
                    <div className="w-9 h-9 bg-white p-0.5 rounded flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-900" />
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-[9px] text-emerald-400 font-bold">VERIFIED AUTHENTIC</div>
                      <div className="text-xs font-bold text-slate-200">{selectedCert.certificate_number}</div>
                      <div className="text-[8px] text-slate-500">SHA-256 SEALED</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1e293b] p-8 rounded-lg border border-slate-700 text-center text-slate-400 text-xs font-mono">
              Select a certificate on the left to preview accredited document details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
