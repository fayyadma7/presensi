"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatOneDReader } from '@zxing/browser';
import { Video, RotateCcw, Camera, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/helpers';
import { playSuccessSound, playClickSound, vibrate } from '@/lib/sound';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const lastScannedRef = useRef<string>('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initDoneRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Keep onScan ref up to date without causing re-renders
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setHasPermission(false);
      setScanning(false);
      setDevices([]);
      setSelectedDeviceId('');
      initDoneRef.current = false;
    } else {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
    lastScannedRef.current = '';
    setScanning(false);
    setHasPermission(false);
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  // Initialize camera once when modal opens
  useEffect(() => {
    if (!isOpen || initDoneRef.current) return;
    initDoneRef.current = true;

    async function init() {
      try {
        setError(null);

        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          setError('Kamera memerlukan HTTPS atau localhost. Akses via http://localhost:3000');
          return;
        }

        console.log('[Scanner] Requesting camera permission...');
        const permStream = await navigator.mediaDevices.getUserMedia({ video: true });
        permStream.getTracks().forEach(t => t.stop());
        console.log('[Scanner] Permission granted');

        const videoDevices = await navigator.mediaDevices.enumerateDevices();
        const cams = videoDevices.filter(d => d.kind === 'videoinput');
        console.log('[Scanner] Found cameras:', cams.length, cams.map(c => c.label || c.deviceId.slice(0, 8)));

        setDevices(cams);

        if (cams.length === 0) {
          setError('Tidak ada kamera yang terdeteksi.');
          return;
        }

        const rearCam = cams.find(d => /back|rear|environment/i.test(d.label));
        const defaultCam = rearCam || cams[0];
        setSelectedDeviceId(defaultCam.deviceId);
      } catch (e: any) {
        console.error('[Scanner] Init error:', e);
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setError('Izin kamera ditolak. Buka pengaturan browser untuk mengizinkan.');
        } else {
          setError('Gagal menginisialisasi kamera: ' + e.message);
        }
      }
    }

    init();

    return () => cleanup();
  }, [isOpen, cleanup]);

  // Start scanning when deviceId is set
  useEffect(() => {
    if (!selectedDeviceId || !isOpen || !videoRef.current) return;

    let cancelled = false;

    async function start() {
      if (!videoRef.current) return;

      try {
        setError(null);
        setScanning(true);
        console.log('[Scanner] Starting scan for device:', selectedDeviceId);

        const scanner = new BrowserMultiFormatOneDReader();

        const controls = await scanner.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (!result) return;
            const text = result.getText();

            // Debounce
            if (lastScannedRef.current === text || cooldownRef.current) return;
            lastScannedRef.current = text;

            console.log('[Scanner] Barcode detected:', text);
            playSuccessSound();
            vibrate([50, 30, 50]);

            if (videoRef.current) {
              videoRef.current.style.outline = '4px solid #22c55e';
              setTimeout(() => {
                if (videoRef.current) videoRef.current.style.outline = 'none';
              }, 300);
            }

            onScanRef.current(text);

            cooldownRef.current = setTimeout(() => {
              lastScannedRef.current = '';
              cooldownRef.current = null;
            }, 2000);
          }
        );

        if (cancelled) {
          try { controls.stop(); } catch {}
          return;
        }

        controlsRef.current = controls;
        setHasPermission(true);
        console.log('[Scanner] Scanner active');

        const stream = videoRef.current?.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()[0];
        if (track && 'torch' in track.getSettings()) {
          setTorchAvailable(true);
        }
      } catch (e: any) {
        console.error('[Scanner] Start error:', e);
        if (!cancelled) {
          if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            setError('Izin kamera ditolak.');
          } else if (e.name === 'NotFoundError') {
            setError('Kamera tidak ditemukan.');
          } else {
            setError('Gagal memulai scanner: ' + e.message);
          }
          setScanning(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
        controlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHasPermission(false);
    };
  }, [selectedDeviceId, isOpen]);

  const switchCamera = useCallback(() => {
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) {
      playClickSound();
      setSelectedDeviceId(nextDevice.deviceId);
    }
  }, [devices, selectedDeviceId]);

  const toggleTorch = useCallback(async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0];
    if (track && 'torch' in track.getSettings()) {
      try {
        // @ts-expect-error torch is valid for video tracks
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
        playClickSound();
      } catch (e) {
        console.warn('[Scanner] Torch failed:', e);
      }
    }
  }, [torchOn]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 md:p-4">
      <div className="w-full max-w-md clay-card bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-xl">
              <Video className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-heading text-base font-bold text-foreground">Scan Barcode Siswa</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Tutup scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black p-1">
          <div className="relative aspect-[3/2] md:aspect-[4/3] overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn(
                "w-64 h-32 border-2 rounded-xl flex items-center justify-center transition-all duration-300",
                scanning ? "border-primary/50" : "border-white/30"
              )}>
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary/90 text-white text-xs font-bold rounded-full whitespace-nowrap">
                  Arahkan ke barcode
                </div>
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-primary" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-primary" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-primary" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-primary" />

                {scanning && (
                  <div className="absolute left-0 right-0 h-1 bg-primary/80 animate-scan-line"
                    style={{ animation: 'scanLine 2s linear infinite' }} />
                )}
              </div>
            </div>

            {/* Error overlay */}
            {error && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-red-600/95 text-white text-center z-10">
                <div className="flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium break-words whitespace-normal">{error}</span>
                  {error.includes('ditolak') && (
                    <button
                      onClick={() => {
                        playClickSound();
                        navigator.mediaDevices.getUserMedia({ video: true })
                          .then(() => {
                            setError(null);
                            setSelectedDeviceId('');
                            setTimeout(() => {
                              if (devices.length > 0) setSelectedDeviceId(devices[0].deviceId);
                            }, 100);
                          })
                          .catch(() => {});
                      }}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      Coba Minta Izin Lagi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Camera indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {hasPermission && (
              <span className="px-2 py-1 bg-green-500/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Kamera Aktif
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 space-y-2 overflow-y-auto flex-shrink-0">
          {devices.length > 1 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <label className="text-xs font-bold text-muted-foreground block mb-0.5">Pilih Kamera</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    playClickSound();
                    setSelectedDeviceId(e.target.value);
                  }}
                  className="w-full bg-white/50 border border-border rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-primary truncate"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={switchCamera}
              disabled={devices.length <= 1}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs clay-transition",
                devices.length > 1
                  ? "clay-card bg-white text-foreground shadow-sm hover:shadow-md"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Ganti Kamera
            </button>

            {torchAvailable && (
              <button
                onClick={toggleTorch}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs clay-transition",
                  torchOn
                    ? "clay-button-accent text-white"
                    : "clay-card bg-white text-foreground shadow-sm hover:shadow-md"
                )}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 .5h5l-1-.5-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {torchOn ? 'Matikan' : 'Nyalakan'} Lampu
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs clay-card bg-white text-destructive hover:bg-red-50 hover:shadow-md clay-transition"
            >
              <X className="h-4 w-4" />
              Tutup
            </button>
          </div>

          <div className="p-2 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-[11px] text-primary font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Tips: Pastikan barcode terang, datar, dan memenuhi kotak scan
            </p>
          </div>
        </div>

        {/* Loading state */}
        {!hasPermission && scanning && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-3xl">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p>Memulai kamera...</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes scanLine {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #22c55e, transparent);
          animation: scanLine 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
