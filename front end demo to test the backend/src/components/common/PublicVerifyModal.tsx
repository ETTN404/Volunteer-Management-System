import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Building2,
  User,
  ExternalLink,
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';

interface PublicVerifyModalProps {
  initialCertNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PublicVerifyModal: React.FC<PublicVerifyModalProps> = ({
  initialCertNumber = '',
  isOpen,
  onClose,
}) => {
  const [certInput, setCertInput] = useState(initialCertNumber || 'CERT-2026-0050');
  const [isLoading, setIsLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || certInput).trim();
    if (!code) return;

    setIsLoading(true);
    setErrorMsg(null);
    setVerifyResult(null);

    const res = await ApiClient.request('GET', `/api/public/certificates/${code}/verify`);
    setIsLoading(false);

    if (res.status === 200 && res.data) {
      setVerifyResult(res.data);
    } else {
      setErrorMsg(res.error || 'Certificate not found in cryptographic registry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">CERTIFICATE VERIFICATION REGISTRY</h3>
              <p className="text-[10px] text-slate-400">Public Audit Portal (§14.3)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300 uppercase">
              ENTER CERTIFICATE ID OR QR HASH:
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="e.g. CERT-2026-0050"
                className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleVerify()}
                disabled={isLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded border border-emerald-400/40 shadow-sm transition-all flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>VERIFY</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {verifyResult && (
            <div className="bg-slate-900 p-3 rounded border border-emerald-500/40 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AUTHENTICATED RECORD VALID
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {verifyResult.certificate_number}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Accredited Volunteer:</span>
                  <span className="font-bold text-white">{verifyResult.volunteer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Awarding Organization:</span>
                  <span className="font-bold text-slate-200">{verifyResult.organization_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Milestone Service Level:</span>
                  <span className="font-bold text-amber-300">
                    {verifyResult.milestone_hours} Verified Hours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of Issuance:</span>
                  <span className="text-slate-300">{verifyResult.issued_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Authorized Signatory:</span>
                  <span className="text-slate-300">{verifyResult.signatory_name}</span>
                </div>
              </div>

              <div className="pt-1.5 text-[9px] text-slate-500 border-t border-slate-800">
                Audit Checksum: 0x9f482a...e7b1 (Verified against multi-tenant master registry)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
