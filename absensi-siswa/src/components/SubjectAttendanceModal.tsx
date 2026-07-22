"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDateLocal } from "@/lib/helpers";

interface Student {
  id: string;
  nis: string;
  name: string;
}

interface SubjectSchedule {
  id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher_id?: string;
  teacher_name?: string;
}

interface SubjectAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: SubjectSchedule | null;
  currentTeacherName: string;
  readOnly?: boolean;
}

export function SubjectAttendanceModal({
  open,
  onOpenChange,
  schedule,
  currentTeacherName,
  readOnly = false,
}: SubjectAttendanceModalProps) {
  const [subjectStudents, setSubjectStudents] = useState<Student[]>([]);
  const [subjectAttendanceMap, setSubjectAttendanceMap] = useState<Record<string, string>>({});
  const [subjectTimeMap, setSubjectTimeMap] = useState<Record<string, string>>({});
  const [subjectDailyAttMap, setSubjectDailyAttMap] = useState<Record<string, string | null>>({});

  const supabase = createClient();

  useEffect(() => {
    if (open && schedule) {
      fetchData();
    }
  }, [open, schedule]);

  async function fetchData() {
    if (!schedule) return;
    
    const { data } = await supabase
      .from("students")
      .select("id, nis, name")
      .eq("class_id", schedule.class_id)
      .eq("status", "active")
      .order("nis");

    setSubjectStudents(data || []);

    const today = formatDateLocal();
    const studentIds = data?.map((s: Student) => s.id) || [];
    const attMap: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: saData } = await supabase
        .from("subject_attendances")
        .select("student_id, status, log")
        .eq("date", today)
        .in("student_id", studentIds);

      const timeMap: Record<string, string> = {};
      saData?.forEach((a: { student_id: string; status: string; log?: any[] }) => {
        attMap[a.student_id] = a.status;
        if (a.log && Array.isArray(a.log) && a.log.length > 0) {
          const logs = [...a.log].reverse();
          const tLog = logs.find((l: any) => l.teacher_name === currentTeacherName) || logs[0];
          if (tLog && tLog.time) {
            const d = new Date(tLog.time);
            timeMap[a.student_id] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        }
      });
      setSubjectTimeMap(timeMap);

      const { data: priorAtt } = await supabase
        .from("attendance")
        .select("student_id, masuk_status, late_status")
        .eq("date", today)
        .in("student_id", studentIds)
        .not("masuk_status", "is", null);

      const dailyAttMap: Record<string, string | null> = {};
      priorAtt?.forEach((a: { student_id: string; masuk_status: string; late_status: string | null }) => {
        dailyAttMap[a.student_id] = a.late_status === 'terlambat' ? 'terlambat' : a.masuk_status;
      });
      setSubjectDailyAttMap(dailyAttMap);
    }

    setSubjectAttendanceMap(attMap);
  }

  async function markSubjectAttendance(studentId: string, status: string) {
    if (readOnly || !schedule) return;
    
    const today = formatDateLocal();
    const nowISO = new Date().toISOString();

    const logEntry = { teacher_name: currentTeacherName, status, time: nowISO };

    const { error: saError } = await supabase.rpc("append_subject_attendance_log", {
      p_student_id: studentId,
      p_date: today,
      p_status: status,
      p_log_entry: logEntry,
    });

    if (saError) {
      toast.error("Gagal menyimpan presensi siswa");
      return;
    }

    toast.success("Presensi siswa berhasil disimpan");
    setSubjectAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
    const d = new Date();
    const nowHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setSubjectTimeMap((prev) => ({ ...prev, [studentId]: nowHHMM }));
  }

  async function markAllHadir() {
    if (readOnly || !schedule) return;
    const today = formatDateLocal();
    const nowISO = new Date().toISOString();
    const logEntry = { teacher_name: currentTeacherName, status: "hadir", time: nowISO };

    const results = await Promise.all(
      subjectStudents.map(async (student) => {
        const { error: saError } = await supabase.rpc("append_subject_attendance_log", {
          p_student_id: student.id,
          p_date: today,
          p_status: "hadir",
          p_log_entry: logEntry,
        });

        if (!saError) {
          return true;
        }
        return false;
      })
    );

    const count = results.filter(Boolean).length;
    toast.success(`${count} siswa ditandai Hadir`);
    const newMap: Record<string, string> = {};
    const newTimeMap: Record<string, string> = {};
    const d = new Date();
    const nowHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    subjectStudents.forEach((s) => { 
      newMap[s.id] = "hadir"; 
      newTimeMap[s.id] = nowHHMM; 
    });
    setSubjectAttendanceMap((prev) => ({ ...prev, ...newMap }));
    setSubjectTimeMap((prev) => ({ ...prev, ...newTimeMap }));
  }

  const scheduleNowHHMM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();
  
  const scheduleTimeDisabled = !schedule || !!(
    (schedule.start_time && scheduleNowHHMM < schedule.start_time.slice(0, 5)) ||
    (schedule.end_time && scheduleNowHHMM > schedule.end_time.slice(0, 5))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] clay-card border-0 !p-0">
        <div className="p-6 min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground text-left break-words">
            Presensi {schedule?.subject_name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {schedule?.class_name} ·{' '}
            {schedule?.start_time?.slice(0, 5)}-{schedule?.end_time?.slice(0, 5)}
            {schedule?.room ? ` · ${schedule.room}` : ""}
          </p>

          {!readOnly && (
            <>
              <div className="flex justify-start mb-4">
                <button
                  onClick={markAllHadir}
                  disabled={scheduleTimeDisabled}
                  className={`px-4 py-2 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2 ${
                    scheduleTimeDisabled ? "bg-muted text-muted-foreground/40 cursor-not-allowed" : "clay-button"
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Semua Hadir
                </button>
              </div>
              {scheduleTimeDisabled && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Di luar jam pelajaran. Presensi siswa tidak dapat dilakukan.</span>
                </div>
              )}
            </>
          )}

          <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-border/50 rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Siswa</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Presensi Masuk</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Aksi</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Waktu Presensi</th>
                </tr>
              </thead>
              <tbody>
                {subjectStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada siswa aktif di kelas ini</td>
                  </tr>
                ) : (
                  <>
                    {subjectStudents.map((student) => {
                      const currentStatus = subjectAttendanceMap[student.id];
                      return (
                        <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{student.name}</p>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {(() => {
                              const dailyStatus = subjectDailyAttMap[student.id];
                              if (!dailyStatus) return <span className="px-2 py-1 text-xs font-bold rounded-xl bg-muted text-muted-foreground border-2 border-border">—</span>;
                              const cls = dailyStatus === "hadir" ? "bg-success/10 text-success border-success/20" :
                                          dailyStatus === "terlambat" ? "bg-warning/10 text-warning border-warning/20" :
                                          dailyStatus === "sakit" ? "bg-warning/10 text-warning border-warning/20" :
                                          dailyStatus === "izin" ? "bg-info/10 text-info border-info/20" :
                                          dailyStatus === "dispen" ? "bg-sky-100 text-sky-600 border-sky-200" :
                                          dailyStatus === "tidak_hadir" ? "bg-red-100 text-red-600 border-red-200" :
                                          "bg-destructive/10 text-destructive border-destructive/20";
                              const lbl = dailyStatus === "hadir" ? "Hadir" : dailyStatus === "terlambat" ? "Terlambat" : dailyStatus === "sakit" ? "Sakit" : dailyStatus === "izin" ? "Izin" : dailyStatus === "dispen" ? "Dispen" : dailyStatus === "tidak_hadir" ? "Tidak Hadir" : "Alpa";
                              return <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-xl border-2 ${cls}`}>{lbl}</span>;
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="inline-flex justify-center items-center gap-1.5 w-full">
                              {(["hadir", "tidak_hadir", "sakit", "izin", "dispen"] as const).map((st) => {
                                const isDisabled = readOnly || scheduleTimeDisabled;
                                const title = readOnly ? "Mode Read-Only" : scheduleTimeDisabled ? "Di luar jam pelajaran" : "";
                                return (
                                  <button
                                    key={st}
                                    onClick={() => !isDisabled && markSubjectAttendance(student.id, st)}
                                    disabled={isDisabled}
                                    title={title}
                                    className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition ${!readOnly ? 'cursor-pointer' : ''} ${
                                      isDisabled && currentStatus !== st
                                        ? "bg-muted text-muted-foreground/40 opacity-50 cursor-not-allowed"
                                        : currentStatus === st
                                          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    }`}
                                  >
                                    {st === "hadir" ? "H" : st === "tidak_hadir" ? "TH" : st === "sakit" ? "S" : st === "izin" ? "I" : "D"}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="text-xs font-mono font-medium text-muted-foreground">
                              {subjectTimeMap[student.id] || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
            <button
              onClick={() => onOpenChange(false)}
              className="clay-button px-5 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
