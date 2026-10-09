import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  QrCode,
  MapPin,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sparkles,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { Shift, Event } from '../../types/vms';
import { GeofenceService } from '../../services/geofenceService';
import { ApiClient } from '../../services/apiClient';

interface CheckInModalProps {
  shift: Shift;
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  shift,
  event,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step 1: QR Signature, Step 2: GPS Geofence, Step 3: Signature Pad
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [qrInput, setQrInput] = useState(shift.qr_code_signature || '');
  const [simulatedLat, setSimulatedLat] = useState(event.latitude);
  const [simulatedLon, setSimulatedLon] = useState(event.longitude);
  const [distanceInfo, setDistanceInfo] = useState({
    distanceMeters: 0,
    isWithin: true,
  });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Calculate distance on lat/lon update
  useEffect(() => {
    const res = GeofenceService.isWithinGeofence(
      simulatedLat,
      simulatedLon,
      event.latitude,
      event.longitude,
      event.geofence_radius
    );
    setDistanceInfo({
      distanceMeters: res.distanceMeters,
      isWithin: res.isWithin,
    });
  }, [simulatedLat, simulatedLon, event]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // Submit check-in
  const handleFinalCheckIn = async () => {
    setIsCheckingIn(true);
    setErrorMessage(null);

    let signaturePreview = '';
    if (canvasRef.current) {
      signaturePreview = canvasRef.current.toDataURL();
    }

    const payload = {
      shift_id: shift.id,
      qr_code_signature: qrInput,
      latitude: simulatedLat,
      longitude: simulatedLon,
      client_timestamp: new Date().toISOString(),
      signature_preview: signaturePreview,
    };

    const res = await ApiClient.request('POST', '/volunteer/check-in', payload);

    setIsCheckingIn(false);
    if (res.status === 200 || res.status === 201) {
      onSuccess(res.message || 'Check-in verified successfully!');
      onClose();
    } else {
      setErrorMessage(res.error || 'Check-in failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">SMART GEOFENCED CHECK-IN</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                {shift.title} • {event.venue_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator (High Density) */}
        <div className="grid grid-cols-3 bg-slate-900 border-b border-slate-700 text-xs font-bold">
          {[
            { step: 1, label: '1. QR SIGNATURE', icon: QrCode },
            { step: 2, label: '2. GPS GEOFENCE', icon: MapPin },
            { step: 3, label: '3. DIGITAL SIGN', icon: PenTool },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step as any)}
              className={`py-2 flex items-center justify-center gap-1 border-b-2 transition-all text-[11px] ${
                activeStep === s.step
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <s.icon className="w-3 h-3" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-4 space-y-3.5">
          {/* STEP 1: QR CODE */}
          {activeStep === 1 && (
            <div className="space-y-3">
              <div className="text-center bg-slate-900 p-4 rounded border border-slate-700">
                <div className="w-28 h-28 mx-auto bg-white p-2 rounded shadow flex items-center justify-center relative">
                  <div className="w-full h-full border-2 border-slate-900 grid grid-cols-4 gap-0.5 p-1 bg-slate-50">
                    <div className="bg-slate-900 col-span-2 row-span-2 rounded-sm" />
                    <div className="bg-slate-900 col-span-1 row-span-1 rounded-sm" />
                    <div className="bg-slate-900 col-span-1 row-span-1 rounded-sm" />
                    <div className="bg-slate-900 col-span-2 row-span-2 rounded-sm" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                  Simulating Camera Scanner / Coordinator Terminal Token
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 block">
                  QR TOKEN SIGNATURE:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="QR_SIG_..."
                    className="flex-1 bg-slate-900 text-indigo-400 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none"
                  />
                  <button
                    onClick={() => setQrInput(shift.qr_code_signature || 'QR_SIG_TEST_VALID')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 text-slate-300"
                  >
                    AUTOPICK
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveStep(2)}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>CONTINUE TO GEOFENCE</span>
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: GPS GEOFENCE */}
          {activeStep === 2 && (
            <div className="space-y-3">
              <div className="bg-slate-900 p-3 rounded border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    <span>HAVERSINE GEOFENCE ENGINE (§6.3)</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      distanceInfo.isWithin
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {distanceInfo.isWithin ? 'WITHIN RADIUS' : 'GEOFENCE VIOLATION'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-lg font-bold text-white">
                      {distanceInfo.distanceMeters}m
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      CURRENT DISTANCE
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-lg font-bold text-emerald-400">
                      {event.geofence_radius}m
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      MAX ALLOWED RADIUS
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400">
                  <span className="font-bold text-slate-300">TARGET:</span> {event.venue_name} ({event.latitude.toFixed(4)}, {event.longitude.toFixed(4)})
                </div>
              </div>

              {/* Simulation buttons */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400">TEST GEOFENCE COORDINATES:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setSimulatedLat(event.latitude + 0.0001);
                      setSimulatedLon(event.longitude + 0.0001);
                    }}
                    className="p-1.5 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 text-left"
                  >
                    📍 At Venue (~12m)
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedLat(event.latitude + 0.006);
                      setSimulatedLon(event.longitude + 0.006);
                    }}
                    className="p-1.5 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 text-left"
                  >
                    📍 Too Far (~700m)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-700">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600"
                >
                  BACK
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  disabled={!distanceInfo.isWithin}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>CONTINUE TO SIGNATURE</span>
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DIGITAL SIGNATURE PAD */}
          {activeStep === 3 && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-indigo-400" />
                    <span>VOLUNTEER DIGITAL SIGNATURE CANVAS (§3.2):</span>
                  </label>
                  <button
                    onClick={clearCanvas}
                    className="text-[10px] text-slate-400 hover:text-rose-400"
                  >
                    CLEAR CANVAS
                  </button>
                </div>
                <div className="border border-slate-700 rounded overflow-hidden bg-slate-950 relative">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[100px] cursor-crosshair touch-none"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 text-[10px]">
                      Draw signature here with mouse or finger
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-400">
                By completing this check-in, you certify service attendance for <strong className="text-white">{shift.title}</strong> within venue boundaries.
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-700">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600"
                >
                  BACK
                </button>
                <button
                  onClick={handleFinalCheckIn}
                  disabled={isCheckingIn}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded border border-emerald-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isCheckingIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isCheckingIn ? 'VERIFYING...' : 'COMPLETE VERIFIED CHECK-IN'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
