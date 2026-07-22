"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateLocal, formatDate, countSchoolDays } from "@/lib/helpers";
import { fetchHolidays } from "@/lib/holidays";
import { ArrowLeft, Download, Filter, FileBarChart, CalendarDays, ChevronDown, BarChart3, Calendar as CalendarIcon, X, Loader2 } from "lucide-react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const Select = dynamic(() => import("@/components/ui/select").then((m) => m.Select), { ssr: false });
const SelectContent = dynamic(() => import("@/components/ui/select").then((m) => m.SelectContent), { ssr: false });
const SelectItem = dynamic(() => import("@/components/ui/select").then((m) => m.SelectItem), { ssr: false });
const SelectTrigger = dynamic(() => import("@/components/ui/select").then((m) => m.SelectTrigger), { ssr: false });
const SelectValue = dynamic(() => import("@/components/ui/select").then((m) => m.SelectValue), { ssr: false });

interface RecapData {
  student_id: string;
  nis: string;
  name: string;
  className: string;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  dispen: number;
  alpa: number;
}

function PresensiSiswaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div>
          <Skeleton className="h-8 w-56 mb-1" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="clay-card p-4">
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="flex flex-col sm:flex-row gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTable rows={8} cols={9} />
    </div>
  );
}

export default function AdminPresensiSiswaPage() {
  const supabase = createClient();
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [startDate, setStartDate] = useState(() =>
    formatDateLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(() => formatDateLocal());
  const [recapData, setRecapData] = useState<RecapData[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthForm, setShowMonthForm] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [monthFrom, setMonthFrom] = useState(new Date().getMonth());
  const [yearFrom, setYearFrom] = useState(new Date().getFullYear());
  const [monthTo, setMonthTo] = useState(new Date().getMonth());
  const [yearTo, setYearTo] = useState(new Date().getFullYear());

  const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const selectedClassName =
    selectedClass === "all"
      ? "Semua Kelas"
      : classes.find((c) => c.id === selectedClass)?.name || "Semua Kelas";

  useEffect(() => {
    if (!userId) return;
    initPage();
  }, [userId]);

  useEffect(() => {
    if (userId) fetchRecap();
  }, [selectedClass, startDate, endDate, classes, userId]);

  async function initPage() {
    const { data } = await supabase.from("classes").select("id, name").order("name");
    setClasses(data || []);
    const holidayDates = await fetchHolidays(new Date().getFullYear());
    setHolidays(holidayDates);
    setLoading(false);
  }

  async function fetchRecap() {
    setLoading(true);

    let query = supabase
      .from("students")
      .select("id, nis, name, class_id, classes!inner(name)")
      .eq("status", "active");

    if (selectedClass !== "all") {
      query = query.eq("class_id", selectedClass);
    }

    const { data: studentsData } = await query.order("nis");

    if (!studentsData || studentsData.length === 0) {
      setRecapData([]);
      setLoading(false);
      return;
    }

    const studentIds = studentsData.map((s: { id: string }) => s.id);
    if (studentIds.length === 0) {
      setRecapData([]);
      setLoading(false);
      return;
    }

    const { data: attData } = await supabase
      .from("attendance")
      .select("student_id, masuk_status, late_status")
      .gte("date", startDate)
      .lte("date", endDate)
      .in("student_id", studentIds);

    const countMap: Record<string, Record<string, number>> = {};
    attData?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null }) => {
      if (!countMap[a.student_id]) {
        countMap[a.student_id] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
      }
      if (a.masuk_status === 'hadir') {
        countMap[a.student_id].hadir++;
        if (a.late_status === 'terlambat') countMap[a.student_id].terlambat++;
      } else if (a.masuk_status === 'sakit') countMap[a.student_id].sakit++;
      else if (a.masuk_status === 'izin') countMap[a.student_id].izin++;
      else if (a.masuk_status === 'dispen') countMap[a.student_id].dispen++;
      else if (a.masuk_status === 'alpa') countMap[a.student_id].alpa++;
    });

    const classIdMap: Record<string, string> = {};
    for (const cls of classes) {
      classIdMap[cls.id] = cls.name;
    }

    const schoolDays = countSchoolDays(startDate, endDate, holidays);

    const recap: RecapData[] = studentsData.map(
      (s: {
        id: string;
        nis: string;
        name: string;
        class_id?: string;
        classes: unknown;
      }) => {
        const counts = countMap[s.id] || {
          hadir: 0,
          terlambat: 0,
          sakit: 0,
          izin: 0,
          dispen: 0,
          alpa: 0,
        };

        const calculatedAlpa = Math.max(
          0,
          schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen)
        );

        let resolvedClass = "";
        if (Array.isArray(s.classes) && s.classes.length > 0) {
          resolvedClass = (s.classes[0] as { name: string })?.name || "";
        } else if (
          s.classes &&
          typeof s.classes === "object" &&
          "name" in (s.classes as object)
        ) {
          resolvedClass = (s.classes as { name: string }).name || "";
        }
        if (!resolvedClass && s.class_id && classIdMap[s.class_id]) {
          resolvedClass = classIdMap[s.class_id];
        }

        return {
          student_id: s.id,
          nis: s.nis,
          name: s.name,
          className: resolvedClass,
          ...counts,
          alpa: calculatedAlpa,
        };
      }
    );

    setRecapData(recap);
    setLoading(false);
  }

  async function exportHarian() {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const today = formatDateLocal();

      let query = supabase.from("students").select("id, nis, name, class_id, classes!inner(name)").eq("status", "active");
      if (selectedClass !== "all") query = query.eq("class_id", selectedClass);
      const { data: studentsData } = await query.order("nis");
      if (!studentsData) { setExporting(false); return; }

      const studentIds = studentsData.map((s: { id: string }) => s.id);
      if (studentIds.length === 0) { setExporting(false); return; }

      const { data: attData } = await supabase
        .from("attendance")
        .select("student_id, masuk_status, location_lat, location_lng")
        .eq("date", today)
        .in("student_id", studentIds);

      const attMap: Record<string, { status: string; lat: number | null; lng: number | null }> = {};
      attData?.forEach((a: { student_id: string; masuk_status: string | null; location_lat: number | null; location_lng: number | null }) => {
        if (a.masuk_status && !attMap[a.student_id]) {
          attMap[a.student_id] = { status: a.masuk_status, lat: a.location_lat, lng: a.location_lng };
        }
      });

      const classIdMap: Record<string, string> = {};
      for (const cls of classes) { classIdMap[cls.id] = cls.name; }

      const rows = studentsData.map((s: { id: string; nis: string; name: string; class_id?: string; classes: unknown }, i: number) => {
        let className = "";
        if (Array.isArray(s.classes) && s.classes.length > 0) {
          className = (s.classes[0] as { name: string })?.name || "";
        } else if (s.classes && typeof s.classes === "object" && "name" in (s.classes as object)) {
          className = (s.classes as { name: string }).name || "";
        }
        if (!className && s.class_id && classIdMap[s.class_id]) className = classIdMap[s.class_id];

        const att = attMap[s.id];
        let statusKehadiran = "Tidak Hadir";
        let lokasi = "-";
        if (att) {
          const statusMap: Record<string, string> = {
            hadir: "Hadir", terlambat: "Terlambat", sakit: "Sakit", izin: "Izin", dispen: "Dispen", alpa: "Alpa",
          };
          statusKehadiran = statusMap[att.status] || att.status;
          if (att.lat && att.lng) lokasi = `https://www.google.com/maps?q=${att.lat},${att.lng}`;
        }
        return { No: i + 1, NIS: s.nis, Nama: s.name, Kelas: className, "Status Kehadiran": statusKehadiran, "Detail Lokasi Presensi Masuk": lokasi };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, "Presensi Harian");
      XLSX.writeFile(wb, `presensi-harian-${today}.xlsx`);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  async function exportFilter() {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const studentIds = recapData.map((r) => r.student_id);
      if (studentIds.length === 0) { setExporting(false); return; }

      const { data: attDetail } = await supabase
        .from("attendance")
        .select("student_id, date, masuk_status, late_status, notes")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("student_id", studentIds)
        .order("date");

      const countMap: Record<string, Record<string, number>> = {};
      const notesMap: Record<string, string[]> = {};
      attDetail?.forEach((a: { student_id: string; date: string; masuk_status: string | null; late_status: string | null; notes: string | null }) => {
        if (!countMap[a.student_id]) countMap[a.student_id] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        if (a.masuk_status === 'hadir') {
          countMap[a.student_id].hadir++;
          if (a.late_status === 'terlambat') countMap[a.student_id].terlambat++;
        } else if (a.masuk_status === 'sakit') countMap[a.student_id].sakit++;
        else if (a.masuk_status === 'izin') countMap[a.student_id].izin++;
        else if (a.masuk_status === 'dispen') countMap[a.student_id].dispen++;
        else if (a.masuk_status === 'alpa') countMap[a.student_id].alpa++;
        if (a.masuk_status === "sakit" || a.masuk_status === "izin" || a.masuk_status === "dispen" || a.masuk_status === "alpa") {
          if (!notesMap[a.student_id]) notesMap[a.student_id] = [];
          const label = a.masuk_status === "sakit" ? "Sakit" : a.masuk_status === "izin" ? "Izin" : a.masuk_status === "dispen" ? "Dispen" : "Alpa";
          const text = a.notes ? `${formatDate(a.date)}: ${label} - ${a.notes}` : `${formatDate(a.date)}: ${label}`;
          notesMap[a.student_id].push(text);
        }
      });

      const schoolDays = countSchoolDays(startDate, endDate, holidays);

      const rows = recapData.map((r, i) => {
        const counts = countMap[r.student_id] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        const computedAlpa = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
        const keterangan = (notesMap[r.student_id] || []).join("\n") || "-";
        return {
          No: i + 1, NIS: r.nis, Nama: r.name, Kelas: r.className,
          Hadir: counts.hadir, Terlambat: counts.terlambat, Sakit: counts.sakit, Izin: counts.izin,
          Dispen: counts.dispen,
          Alpa: computedAlpa,
          "Keterangan Sakit/Izin/Dispen/Alpa": keterangan,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
        { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 60 },
      ];
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: 10 })];
        if (cell) cell.s = { alignment: { wrapText: true, vertical: "top" } };
      }
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Filter");
      XLSX.writeFile(wb, `rekap-presensi-${startDate}-sd-${endDate}.xlsx`);
      toast.success("File rekap berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  async function exportBulanan() {
    setExporting(true);
    setShowMonthForm(false);
    try {
      const studentIds = recapData.map((r) => r.student_id);
      if (studentIds.length === 0) { setExporting(false); return; }

      const rangeStart = formatDateLocal(new Date(yearFrom, monthFrom, 1));
      const rangeEnd = formatDateLocal(new Date(yearTo, monthTo + 1, 0));

      const { data: attDetail } = await supabase
        .from("attendance")
        .select("student_id, date, masuk_status, late_status, notes")
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .in("student_id", studentIds)
        .order("date");

      const monthCounts: Record<string, Record<string, { hadir: number; terlambat: number; sakit: number; izin: number; dispen: number; alpa: number }>> = {};
      const monthNotes: Record<string, Record<string, string[]>> = {};

      attDetail?.forEach((a: { student_id: string; date: string; masuk_status: string | null; late_status: string | null; notes: string | null }) => {
        const d = new Date(a.date);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthCounts[a.student_id]) monthCounts[a.student_id] = {};
        if (!monthCounts[a.student_id][mKey]) monthCounts[a.student_id][mKey] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        if (a.masuk_status === 'hadir') {
          monthCounts[a.student_id][mKey].hadir++;
          if (a.late_status === 'terlambat') monthCounts[a.student_id][mKey].terlambat++;
        } else if (a.masuk_status === 'sakit') monthCounts[a.student_id][mKey].sakit++;
        else if (a.masuk_status === 'izin') monthCounts[a.student_id][mKey].izin++;
        else if (a.masuk_status === 'dispen') monthCounts[a.student_id][mKey].dispen++;
        else if (a.masuk_status === 'alpa') monthCounts[a.student_id][mKey].alpa++;
        if (a.masuk_status === "sakit" || a.masuk_status === "izin" || a.masuk_status === "dispen" || a.masuk_status === "alpa") {
          if (!monthNotes[a.student_id]) monthNotes[a.student_id] = {};
          if (!monthNotes[a.student_id][mKey]) monthNotes[a.student_id][mKey] = [];
          const label = a.masuk_status === "sakit" ? "Sakit" : a.masuk_status === "izin" ? "Izin" : a.masuk_status === "dispen" ? "Dispen" : "Alpa";
          const text = a.notes ? `${formatDate(a.date)}: ${label} - ${a.notes}` : `${formatDate(a.date)}: ${label}`;
          monthNotes[a.student_id][mKey].push(text);
        }
      });

      const wb = XLSX.utils.book_new();
      const monthKeys: { key: string; label: string; year: number; month: number }[] = [];
      for (let y = yearFrom; y <= yearTo; y++) {
        const mStart = y === yearFrom ? monthFrom : 0;
        const mEnd = y === yearTo ? monthTo : 11;
        for (let m = mStart; m <= mEnd; m++) {
          monthKeys.push({ key: `${y}-${m}`, label: `${MONTHS[m]} ${y}`, year: y, month: m });
        }
      }

      const monthSchoolDays: Record<string, number> = {};
      for (const mk of monthKeys) {
        const ms = formatDateLocal(new Date(mk.year, mk.month, 1));
        const me = formatDateLocal(new Date(mk.year, mk.month + 1, 0));
        monthSchoolDays[mk.key] = countSchoolDays(ms, me, holidays);
      }

      for (const mk of monthKeys) {
        const schoolDays = monthSchoolDays[mk.key];
        const rows = recapData.map((r, i) => {
          const counts = monthCounts[r.student_id]?.[mk.key] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
          const ca = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
          const notes = (monthNotes[r.student_id]?.[mk.key] || []).join("\n") || "-";
          return {
            No: i + 1, NIS: r.nis, Nama: r.name, Kelas: r.className,
            Hadir: counts.hadir, Terlambat: counts.terlambat, Sakit: counts.sakit, Izin: counts.izin,
            Dispen: counts.dispen,
            Alpa: ca,
            "Keterangan Sakit/Izin/Dispen/Alpa": notes,
          };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
          { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
          { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
          { wch: 60 },
        ];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c: 10 })];
          if (cell) cell.s = { alignment: { wrapText: true, vertical: "top" } };
        }
        XLSX.utils.book_append_sheet(wb, ws, mk.label);
      }

      // Rekap Tahunan sheet
      const totalCols = 4 + monthKeys.length * 6;
      const headerRow1: (string | number)[][] = [[]];
      const headerRow2: (string | number)[][] = [[]];
      const merges: XLSX.Range[] = [];

      headerRow1[0] = []; headerRow2[0] = [];
      merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
      merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
      merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
      merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
      headerRow1[0][0] = "No"; headerRow1[0][1] = "NIS"; headerRow1[0][2] = "Nama"; headerRow1[0][3] = "Kelas";
      headerRow2[0][0] = ""; headerRow2[0][1] = ""; headerRow2[0][2] = ""; headerRow2[0][3] = "";

      monthKeys.forEach((mk, mi) => {
        const colStart = 4 + mi * 6;
        headerRow1[0][colStart] = mk.label;
        merges.push({ s: { r: 0, c: colStart }, e: { r: 0, c: colStart + 5 } });
        headerRow2[0][colStart] = "Hadir";
        headerRow2[0][colStart + 1] = "Terlambat";
        headerRow2[0][colStart + 2] = "Sakit";
        headerRow2[0][colStart + 3] = "Izin";
        headerRow2[0][colStart + 4] = "Dispen";
        headerRow2[0][colStart + 5] = "Alpa";
      });

      const dataRows: (string | number)[][] = recapData.map((r, i) => {
        const row: (string | number)[] = [i + 1, r.nis, r.name, r.className];
        monthKeys.forEach((mk) => {
          const counts = monthCounts[r.student_id]?.[mk.key] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
          const ca = Math.max(0, (monthSchoolDays[mk.key] || 0) - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
          row.push(counts.hadir, counts.terlambat, counts.sakit, counts.izin, counts.dispen, ca);
        });
        return row;
      });

      const allRows = [...headerRow1, ...headerRow2, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!merges"] = merges;

      const colWidths: { wch: number }[] = [
        { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
      ];
      monthKeys.forEach(() => {
        colWidths.push({ wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 });
      });
      ws["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Tahunan");

      XLSX.writeFile(wb, `rekap-presensi-${MONTHS[monthFrom]}-${yearFrom}-sd-${MONTHS[monthTo]}-${yearTo}.xlsx`);
      toast.success("File rekap bulanan berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  function getStatusBadge(status: string, count: number) {
    const colors: Record<string, string> = {
      hadir: "text-success font-bold",
      terlambat: "text-warning font-bold",
      sakit: "text-muted-foreground",
      izin: "text-muted-foreground",
      dispen: "text-info font-bold",
      alpa: "text-destructive font-bold",
    };
    return <span className={colors[status] || ""}>{count}</span>;
  }

  return (
    <SkeletonWrapper loading={loading && recapData.length === 0} skeleton={<PresensiSiswaSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/students")}
          className="p-2.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="p-3 bg-primary/10 rounded-2xl">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Rekap Presensi Siswa
          </h1>
          <p className="text-sm text-muted-foreground">
            Laporan kehadiran seluruh siswa
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Filter</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2.5 flex-1">
            <label className="text-xs font-bold text-muted-foreground">
              Kelas
            </label>
            <Select
              value={selectedClass}
              onValueChange={(v) => setSelectedClass(String(v || "all"))}
            >
              <SelectTrigger className="cursor-pointer clay-input h-10 px-4 rounded-xl border-0">
                <span>{selectedClassName}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  Semua Kelas
                </SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground block mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="clay-input px-4 py-2 rounded-xl outline-none"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground block mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="clay-input px-4 py-2 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="clay-button px-4 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Mengekspor..." : "Export Excel"}
              <ChevronDown className={`h-3 w-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[220px]">
                  <button
                    onClick={exportHarian}
                    disabled={exporting}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CalendarDays className="h-4 w-4 text-primary" /> Ekspor Harian
                    <span className="text-xs text-muted-foreground ml-auto">Presensi hari ini</span>
                  </button>
                  <button
                    onClick={exportFilter}
                    disabled={exporting}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <BarChart3 className="h-4 w-4 text-primary" /> Ekspor Hasil Filter
                    <span className="text-xs text-muted-foreground ml-auto">Rekap sesuai tanggal</span>
                  </button>
                  <button
                    onClick={() => { setShowMonthForm(true); setShowExportMenu(false); }}
                    disabled={exporting}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" /> Ekspor Bulanan
                    <span className="text-xs text-muted-foreground ml-auto">Multi-sheet per bulan</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="clay-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-bold text-foreground">
            Rekap{" "}
            {new Date(startDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            -{" "}
            {new Date(endDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap w-10">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  NIS
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Kelas
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Hadir
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Terlambat
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Sakit
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Izin
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Dispen
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">
                  Alpa
                </th>
              </tr>
            </thead>
            <tbody>
              {recapData.map((r, i) => (
                <tr
                  key={r.student_id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                    {r.nis}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.className}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("hadir", r.hadir)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("terlambat", r.terlambat)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("sakit", r.sakit)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("izin", r.izin)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("dispen", r.dispen)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {getStatusBadge("alpa", r.alpa)}
                  </td>
                </tr>
              ))}
              {recapData.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Tidak ada data untuk rentang tanggal ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Month Form Modal */}
      {showMonthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMonthForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-foreground text-lg">Pilih Rentang Bulan</h3>
              <button onClick={() => setShowMonthForm(false)} className="p-1 hover:bg-muted rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Dari Bulan</label>
                <select
                  value={monthFrom}
                  onChange={(e) => setMonthFrom(Number(e.target.value))}
                  className="clay-input px-3 py-2 text-sm rounded-xl outline-none w-full"
                >
                  {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Tahun</label>
                <select
                  value={yearFrom}
                  onChange={(e) => setYearFrom(Number(e.target.value))}
                  className="clay-input px-3 py-2 text-sm rounded-xl outline-none w-full"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Sampai Bulan</label>
                <select
                  value={monthTo}
                  onChange={(e) => setMonthTo(Number(e.target.value))}
                  className="clay-input px-3 py-2 text-sm rounded-xl outline-none w-full"
                >
                  {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Tahun</label>
                <select
                  value={yearTo}
                  onChange={(e) => setYearTo(Number(e.target.value))}
                  className="clay-input px-3 py-2 text-sm rounded-xl outline-none w-full"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMonthForm(false)} className="px-4 py-2 text-sm font-bold rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer">Batal</button>
              <button onClick={exportBulanan} disabled={exporting} className="clay-button px-4 py-2 text-sm font-bold rounded-xl text-white cursor-pointer disabled:opacity-50">
                {exporting ? "Mengekspor..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SkeletonWrapper>
  );
}
