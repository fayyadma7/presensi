"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock, AlertCircle, Loader2, MapPin, User, IdCard, GraduationCap, CalendarOff } from 'lucide-react';
import { cn, formatDateLocal } from '@/lib/helpers';
import { playSuccessSound, playErrorSound, vibrate } from '@/lib/sound';
import { toast } from 'sonner';

interface StudentInfo {
  id: string;
  nis: string;
  name: string;
  className: string;
  classId: string;
}

interface ScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanNext: () => void;
  scannedBarcode?: string;
  isHoliday?: boolean;
}

export default function ScanResultModal({ 
  isOpen, 
  onClose, 
  onScanNext,
  scannedBarcode,
  isHoliday = false
}: ScanResultModalProps) {
  const supabase = createClient();
  const { userId } = useAuth();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoStatus, setAutoStatus] = useState<'hadir' | 'terlambat' | 'pulang' | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [existingPresence, setExistingPresence] = useState<{ status: string; type: string; time?: string } | null>(null);
  const [currentTeacherName, setCurrentTeacherName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStudent(null);
      setLoading(true);
      setAutoStatus(null);
      setError(null);
      setExistingPresence(null);
      setSaving(false);
      return;
    }

    async function init() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch current teacher name
        if (userId) {
          const { data: userData } = await supabase.from('users').select('name').eq('id', userId).maybeSingle();
          if (userData) setCurrentTeacherName(userData.name);
        }

        // Fetch settings for time window detection
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        const map: Record<string, string> = {};
        if (settingsData) {
          settingsData.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));
          setSettings(map);
        }

        // If we have a scanned barcode, look up student
        if (scannedBarcode) {
          const nis = scannedBarcode.replace(/^SIS/i, '');
          
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('id, nis, name, class_id, classes(name)')
            .eq('nis', nis)
            .eq('status', 'active')
            .maybeSingle();

          if (studentError || !studentData) {
            playErrorSound();
            vibrate([100, 50, 100]);
            setError('Siswa tidak ditemukan atau tidak aktif');
            return;
          }

          const className = Array.isArray(studentData.classes)
            ? studentData.classes[0]?.name || ''
            : (studentData.classes as any)?.name || '';

          const studentInfo: StudentInfo = {
            id: studentData.id,
            nis: studentData.nis,
            name: studentData.name,
            className,
            classId: studentData.class_id,
          };

          setStudent(studentInfo);

          // Check existing attendance today (new schema: 1 row per day with masuk_status/pulang_status)
          const today = formatDateLocal();
          const { data: existing } = await supabase
            .from('attendance')
            .select('masuk_status, pulang_status, masuk_time, pulang_time, late_status')
            .eq('student_id', studentInfo.id)
            .eq('date', today)
            .maybeSingle();

          // Build local existing presence for logic (before React state updates)
          const localExisting: { status: string; type: string; time?: string } | null = (() => {
            if (!existing) return null;
            const hasMasuk = existing.masuk_status !== null && existing.masuk_status !== undefined;
            const hasPulang = existing.pulang_status !== null && existing.pulang_status !== undefined;
            if (hasMasuk) {
              const time = existing.masuk_time ? new Date(existing.masuk_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
              const displayStatus = existing.late_status === 'terlambat' ? 'terlambat' : existing.masuk_status;
              setExistingPresence({ status: displayStatus, type: 'berangkat', time });
              return { status: displayStatus, type: 'berangkat', time };
            }
            if (hasPulang) {
              const time = existing.pulang_time ? new Date(existing.pulang_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
              setExistingPresence({ status: existing.pulang_status, type: 'pulang', time });
              return { status: existing.pulang_status, type: 'pulang', time };
            }
            return null;
          })();

          // Determine auto status based on current time + local existing (not stale state)
          const status = determineAutoStatus(map, localExisting);
          setAutoStatus(status);
          
          playSuccessSound();
          vibrate([50, 30, 50]);
        }
      } catch (e) {
        console.error('Scan result init error:', e);
        setError('Gagal memuat data siswa');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [isOpen, scannedBarcode, supabase]);

  function determineAutoStatus(
    settingsMap: Record<string, string>,
    existing: { status: string; type: string; time?: string } | null,
  ): 'hadir' | 'terlambat' | 'pulang' | null {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const morningStart = settingsMap.morning_start?.substring(0, 5) || '06:30';
    const lateThreshold = settingsMap.late_threshold?.substring(0, 5) || '07:00';
    const afternoonStart = settingsMap.afternoon_start?.substring(0, 5) || '12:00';
    const afternoonEnd = settingsMap.afternoon_end?.substring(0, 5) || '14:00';
    const autoLate = settingsMap.auto_late === 'true';

    const sudahMasuk = existing?.type === 'berangkat';

    if (sudahMasuk) {
      // Already did morning attendance → pulang if in afternoon window
      if (currentTime >= afternoonStart && currentTime <= afternoonEnd) {
        return 'pulang';
      }
      // Already did morning but not afternoon yet → no valid action
      return null;
    }

    // Has NOT done morning attendance → hadir/terlambat
    if (currentTime >= morningStart && currentTime <= afternoonEnd) {
      return autoLate && currentTime > lateThreshold ? 'terlambat' : 'hadir';
    }

    // Before school starts
    return null;
  }

  async function handleSave() {
    if (!student || !autoStatus) return;
    setSaving(true);

    const today = formatDateLocal();
    const nowISO = new Date().toISOString();

    // 1. Upsert attendance
    try {
      if (autoStatus === 'hadir' || autoStatus === 'terlambat') {
        const { error: attErr } = await supabase.from('attendance').upsert(
          { student_id: student.id, date: today, masuk_status: 'hadir', late_status: autoStatus === 'terlambat' ? 'terlambat' : null, masuk_time: nowISO },
          { onConflict: 'student_id,date' }
        );
        if (attErr) throw attErr;
      } else if (autoStatus === 'pulang') {
        const { error: attErr } = await supabase.from('attendance').upsert(
          { student_id: student.id, date: today, pulang_status: 'pulang', pulang_time: nowISO },
          { onConflict: 'student_id,date' }
        );
        if (attErr) throw attErr;
      }
    } catch (e) {
      console.error('Save attendance error:', e);
      toast.error('Gagal menyimpan presensi. Coba lagi.');
      setSaving(false);
      return;
    }

    // 2. Upsert subject_attendances (atomic via RPC to prevent race condition)
    if (autoStatus !== 'pulang') {
      try {
        const logEntry = { teacher_name: currentTeacherName, status: autoStatus, time: nowISO };
        await supabase.rpc("append_subject_attendance_log", {
          p_student_id: student.id,
          p_date: today,
          p_status: autoStatus,
          p_log_entry: logEntry,
        });
      } catch (e) {
        console.warn('Subject attendance upsert skipped (best-effort):', e);
      }
    }

    playSuccessSound();
    vibrate([50, 30, 50]);
    toast.success(`Presensi ${autoStatus === 'hadir' ? 'Hadir' : autoStatus === 'terlambat' ? 'Hadir (Terlambat)' : 'Pulang'} berhasil disimpan!`);
    setSaving(false);
    onScanNext();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md clay-card bg-white rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <IdCard className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">Hasil Scan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Tutup"
          >
            <AlertCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Memuat data siswa...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">Pastikan barcode benar dan siswa terdaftar</p>
              <button
                onClick={onClose}
                className="mt-4 clay-button px-6 py-2 rounded-xl text-white font-bold"
              >
                Tutup
              </button>
            </div>
          )}

          {student && !loading && !error && (
            <>
              {/* Student Info Card */}
              <div className="clay-card p-5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-lg font-bold text-foreground truncate">{student.name}</p>
                    <p className="font-mono text-sm font-semibold text-primary">NIS: {student.nis}</p>
                    {student.className && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Kelas: {student.className}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Holiday Warning */}
              {isHoliday && (
                <div className="p-4 rounded-2xl text-center border-2 border-amber-300 bg-amber-50">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CalendarOff className="h-5 w-5 text-amber-600" />
                    <span className="font-heading text-lg text-amber-700">HARI LIBUR</span>
                  </div>
                  <p className="text-sm text-amber-600">Hari ini hari libur/tanggal merah.</p>
                  <p className="text-sm text-amber-600 font-medium">Presensi tidak tersedia.</p>
                </div>
              )}

              {/* Auto Status Display */}
              {!isHoliday && existingPresence ? (
                <div className="p-4 rounded-2xl text-center border-2 border-warning/30 bg-warning/10 font-bold">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="font-heading text-lg text-warning">SUDAH PRESENSI</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {existingPresence.type === 'berangkat' ? 'Presensi Masuk' : 'Presensi Pulang'}: <span className="font-bold">{existingPresence.status.toUpperCase()}</span>
                    {existingPresence.time && <span className="text-muted-foreground"> ({existingPresence.time})</span>}
                  </p>
                </div>
              ) : (
                <div className={cn(
                  "p-4 rounded-2xl text-center border-2 font-bold",
                  autoStatus === 'hadir' && "bg-success/10 border-success/30 text-success",
                  autoStatus === 'terlambat' && "bg-warning/10 border-warning/30 text-warning",
                  autoStatus === 'pulang' && "bg-primary/10 border-primary/30 text-primary",
                  autoStatus === null && "bg-destructive/10 border-destructive/30 text-destructive"
                )}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {autoStatus === 'hadir' && <CheckCircle className="h-5 w-5" />}
                    {autoStatus === 'terlambat' && <Clock className="h-5 w-5" />}
                    {autoStatus === 'pulang' && <MapPin className="h-5 w-5" />}
                    {autoStatus === null && <AlertCircle className="h-5 w-5" />}
                    <span className="font-heading text-lg">
                      {autoStatus === 'hadir' ? 'HADIR' : autoStatus === 'terlambat' ? 'TERLAMBAT' : autoStatus === 'pulang' ? 'PULANG' : 'DI LUAR JAM'}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">
                    {autoStatus === 'pulang' 
                      ? 'Presensi pulang otomatis' 
                      : autoStatus === 'terlambat' 
                        ? 'Melewati batas jam masuk'
                        : autoStatus === 'hadir'
                          ? 'Presensi masuk otomatis'
                          : 'Di luar jam presensi sekolah'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {isHoliday ? (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onScanNext}
                    className="flex-1 clay-button py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                  >
                    Scan Berikutnya
                  </button>
                  <button onClick={onClose} className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors">
                    Tutup
                  </button>
                </div>
              ) : existingPresence ? (
                <div className="flex gap-3 pt-2">
                  <button onClick={onScanNext} className="flex-1 clay-button py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                    OK, Scan Berikutnya
                  </button>
                  <button onClick={onClose} className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors">
                    Tutup
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={!autoStatus || saving}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2",
                      autoStatus ? "clay-button" : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : null}
                    {saving ? 'Menyimpan...' : autoStatus ? 'Scan Berikutnya' : 'Di luar jam presensi'}
                  </button>
                  <button onClick={onClose} className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors">
                    Batal
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}