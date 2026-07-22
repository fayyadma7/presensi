"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  Stethoscope,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface StudentRecord {
  id: string;
  name: string;
  nis: string;
  class_name: string;
  status: string | null;
  time: string | null;
}

interface StudentListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  status: string | null;
  date: string;
  classId?: string;
}

const CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  "Semua Siswa": { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  "Siswa Hadir": { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  "Siswa Terlambat": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  "Siswa Alpa": { icon: UserX, color: "text-red-600", bg: "bg-red-50" },
  "Siswa Sakit": { icon: Stethoscope, color: "text-teal-600", bg: "bg-teal-50" },
  "Siswa Izin": { icon: ClipboardCheck, color: "text-purple-600", bg: "bg-purple-50" },
  "Siswa Dispen": { icon: ClipboardCheck, color: "text-sky-600", bg: "bg-sky-50" },
};

const ROWS_PER_PAGE = 10;

export default function StudentListModal({
  open,
  onOpenChange,
  title,
  status,
  date,
  classId,
}: StudentListModalProps) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    setPage(1);
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      let studentQuery = supabase
        .from("students")
        .select("id, name, nis, class:classes(name)")
        .eq("status", "active")
        .order("name");

      if (classId) studentQuery = studentQuery.eq("class_id", classId);

      const [studentRes, attRes] = await Promise.all([
        studentQuery,
        supabase.from("attendance").select("student_id, masuk_status, late_status, masuk_time").eq("date", date),
      ]);

      if (cancelled) return;

      const statusMap: Record<string, string | null> = {};
      const timeMap: Record<string, string | null> = {};
      attRes.data?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null; masuk_time: string | null }) => {
        if (!a.student_id) return;
        if (a.masuk_status === 'hadir') {
          statusMap[a.student_id] = a.late_status === 'terlambat' ? 'terlambat' : 'hadir';
        } else {
          statusMap[a.student_id] = a.masuk_status;
        }
        if (a.masuk_time) {
          timeMap[a.student_id] = new Date(a.masuk_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }
      });

      let result: StudentRecord[] = (studentRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        nis: s.nis,
        class_name: s.class?.name || "-",
        status: statusMap[s.id] ?? null,
        time: timeMap[s.id] ?? null,
      }));

      if (status) {
        result = result.filter((s) => s.status === status);
      }

      setStudents(result);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [open, supabase, status, date, classId]);

  const totalPages = Math.ceil(students.length / ROWS_PER_PAGE);
  const paginated = useMemo(
    () => students.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [students, page],
  );

  const cfg = CONFIG[title] || CONFIG["Semua Siswa"];
  const Icon = cfg.icon;

  function statusBadge(statusVal: string | null) {
    if (!statusVal) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-xl border-2 whitespace-nowrap bg-muted text-muted-foreground border-border">
          Belum Berangkat
        </span>
      );
    }
    const cls =
      statusVal === "hadir" ? "bg-success/10 text-success border-success/20" :
      statusVal === "terlambat" ? "bg-warning/10 text-warning border-warning/20" :
      statusVal === "sakit" ? "bg-blue-100 text-blue-600 border-blue-200" :
      statusVal === "izin" ? "bg-purple-100 text-purple-600 border-purple-200" :
      statusVal === "dispen" ? "bg-sky-100 text-sky-600 border-sky-200" :
      "bg-destructive/10 text-destructive border-destructive/20";
    const label =
      statusVal === "hadir" ? "Hadir" :
      statusVal === "terlambat" ? "Terlambat" :
      statusVal === "sakit" ? "Sakit" :
      statusVal === "izin" ? "Izin" :
      statusVal === "dispen" ? "Dispen" : "Alpa";
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-xl border-2 whitespace-nowrap ${cls}`}>
        {label}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] clay-card border-0 !p-0 overflow-hidden">
        <div className="p-6 min-w-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <DialogTitle className="font-heading text-xl font-bold text-foreground">
                {title}
              </DialogTitle>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground font-medium">Memuat data...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-medium">Tidak ada data siswa</div>
          ) : (
            <>
              <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-border/50 rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-12">No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">NIS</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Kelas</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Waktu</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((s, i) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{(page - 1) * ROWS_PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-3 font-mono text-sm text-foreground">{s.nis}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{s.class_name}</td>
                        <td className="px-4 py-3 text-center text-sm text-foreground">{s.time || "-"}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(s.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {(() => {
                    const pages: (number | "...")[] = [];
                    const range = 2;
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
                        pages.push(i);
                      } else if (pages[pages.length - 1] !== "...") {
                        pages.push("...");
                      }
                    }
                    return pages.map((p) =>
                      p === "..." ? (
                        <span key="ellipsis" className="px-1 text-xs text-muted-foreground">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg clay-transition cursor-pointer ${
                            p === page ? "bg-primary text-white" : "hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Menampilkan {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, students.length)} dari {students.length} siswa
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
