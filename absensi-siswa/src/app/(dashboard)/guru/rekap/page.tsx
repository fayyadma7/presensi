"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileBarChart, Filter, CalendarDays, Calendar, BarChart3, ChevronDown, X } from "lucide-react";
import { formatDate, countSchoolDays, formatDateLocal } from "@/lib/helpers";
import { fetchHolidays } from "@/lib/holidays";
import dynamic from "next/dynamic";
import { SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import SkeletonWrapper from "@/components/SkeletonWrapper";



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
  hasLocation: number;
  lastLat: number | null;
  lastLng: number | null;
}

interface AttendanceDetail {
  student_id: string;
  date: string;
  masuk_status: string | null;
  pulang_status: string | null;
  masuk_time: string | null;
  pulang_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function getMonthName(dateStr: string): string {
  const m = new Date(dateStr).getMonth();
  return MONTHS[m];
}

function RekapSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="h-6 w-56 bg-muted animate-pulse rounded" />
        <div className="h-11 w-32 rounded-2xl bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {[1, 2, 3].map((i) => (<div key={i} className="space-y-2 flex-1"><div className="h-4 w-20 bg-muted animate-pulse rounded" /><div className="h-10 w-full bg-muted animate-pulse rounded-2xl" /></div>))}
      </div>
      <SkeletonTable rows={8} cols={8} />
    </>
  );
}

export default function RekapPage() {
  const supabase = createClient();
  const { user, userId, userRole: authRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [userRole, setUserRole] = useState("");
  const [startDate, setStartDate] = useState(() =>
    formatDateLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(() => formatDateLocal());
  const [recapData, setRecapData] = useState<RecapData[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthForm, setShowMonthForm] = useState(false);
  const [monthFrom, setMonthFrom] = useState(() => new Date().getMonth());
  const [yearFrom, setYearFrom] = useState(() => new Date().getFullYear());
  const [monthTo, setMonthTo] = useState(() => new Date().getMonth());
  const [yearTo, setYearTo] = useState(() => new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const selectedClassName = selectedClass === "all" ? "Semua Kelas" : classes.find((c) => c.id === selectedClass)?.name || "Semua Kelas";

  useEffect(() => { initPage(); }, [userId]);
  useEffect(() => { fetchRecap(); }, [selectedClass, startDate, endDate, holidays]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function initPage() {
    if (!userId) return;
    const { data: userData } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    if (userData) setUserRole(userData.role);

    if (userData?.role === "guru") {
      const { data: waliClasses } = await supabase.from("classes").select("id, name").eq("wali_kelas_id", userId);
      if (waliClasses && waliClasses.length > 0) { setClasses(waliClasses); setSelectedClass(waliClasses[0].id); }
    } else {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      setClasses(data || []);
    }

    try {
      const yearHolidays = await fetchHolidays(new Date().getFullYear());
      setHolidays(yearHolidays);
    } catch {
      // Holiday fetch failed, proceed with empty holidays
    }
  }

  async function fetchRecap() {
    setLoading(true);
    let query = supabase.from("students").select("id, nis, name, class_id, classes!inner(name)").eq("status", "active");
    if (selectedClass !== "all") query = query.eq("class_id", selectedClass);
    const { data: studentsData } = await query.order("nis");
    if (!studentsData) { setRecapData([]); setLoading(false); return; }

    const studentIds = studentsData.map((s: { id: string }) => s.id);
    if (studentIds.length === 0) { setRecapData([]); setLoading(false); return; }

    const { data: attData } = await supabase.from("attendance").select("student_id, masuk_status, late_status, location_lat, location_lng").gte("date", startDate).lte("date", endDate).in("student_id", studentIds);
    const countMap: Record<string, Record<string, number>> = {};
    const locationMap: Record<string, number> = {};
    const lastLocationMap: Record<string, { lat: number; lng: number }> = {};
    attData?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null; location_lat: number | null; location_lng: number | null }) => {
      if (!countMap[a.student_id]) countMap[a.student_id] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
      if (a.masuk_status === 'hadir') {
        countMap[a.student_id].hadir++;
        if (a.late_status === 'terlambat') countMap[a.student_id].terlambat++;
      } else if (a.masuk_status === 'sakit') countMap[a.student_id].sakit++;
      else if (a.masuk_status === 'izin') countMap[a.student_id].izin++;
      else if (a.masuk_status === 'dispen') countMap[a.student_id].dispen++;
      else if (a.masuk_status === 'alpa') countMap[a.student_id].alpa++;
      if (a.location_lat && a.location_lng) {
        locationMap[a.student_id] = (locationMap[a.student_id] || 0) + 1;
        lastLocationMap[a.student_id] = { lat: a.location_lat, lng: a.location_lng };
      }
    });

    const classIdMap: Record<string, string> = {};
    for (const cls of classes) { classIdMap[cls.id] = cls.name; }

    const schoolDays = countSchoolDays(startDate, endDate, holidays);

    const recap: RecapData[] = studentsData.map((s: { id: string; nis: string; name: string; class_id?: string; classes: unknown }) => {
      const counts = countMap[s.id] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
      const computedAlpa = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
      counts.alpa = computedAlpa;
      let resolvedClass = "";
      if (Array.isArray(s.classes) && s.classes.length > 0) {
        resolvedClass = (s.classes[0] as { name: string })?.name || "";
      } else if (s.classes && typeof s.classes === "object" && "name" in (s.classes as object)) {
        resolvedClass = (s.classes as { name: string }).name || "";
      }
      if (!resolvedClass && s.class_id && classIdMap[s.class_id]) {
        resolvedClass = classIdMap[s.class_id];
      }
      return { student_id: s.id, nis: s.nis, name: s.name, className: resolvedClass, ...counts, hasLocation: locationMap[s.id] || 0, lastLat: lastLocationMap[s.id]?.lat || null, lastLng: lastLocationMap[s.id]?.lng || null };
    });
    setRecapData(recap);
    setLoading(false);
  }

  // ==================== EXPORT 1: HARIAN ====================
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

      const { data: subjectAttData } = await supabase
        .from("subject_attendances")
        .select("student_id, log")
        .eq("date", today)
        .in("student_id", studentIds);

      const subjectAttMap: Record<string, string> = {};
      subjectAttData?.forEach((sa: any) => {
        if (sa.log && Array.isArray(sa.log)) {
          const teacherMap: Record<string, string> = {};
          sa.log.forEach((l: any) => {
            teacherMap[l.teacher_name] = l.status;
          });
          const summary = Object.entries(teacherMap)
            .map(([tName, tStatus]) => `${tName}: ${tStatus === "hadir" ? "H" : tStatus === "terlambat" ? "T" : tStatus === "sakit" ? "S" : tStatus === "izin" ? "I" : tStatus === "dispen" ? "D" : tStatus === "tidak_hadir" ? "TH" : "A"}`)
            .join(", ");
          subjectAttMap[sa.student_id] = summary;
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
          if (att.lat && att.lng) {
            lokasi = `https://www.google.com/maps?q=${att.lat},${att.lng}`;
          }
        }

        return { No: i + 1, NIS: s.nis, Nama: s.name, Kelas: className, "Status Kehadiran": statusKehadiran, "Log Presensi Mapel": subjectAttMap[s.id] || "-", "Detail Lokasi Presensi Masuk": lokasi };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, "Presensi Harian");
      XLSX.writeFile(wb, `presensi-harian-${today}.xlsx`);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  // ==================== EXPORT 2: HASIL FILTER ====================
  async function exportFilter() {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const studentIds = recapData.map((r) => r.student_id);
      if (studentIds.length === 0) { setExporting(false); return; }

      const { data: attDetail } = await supabase
        .from("attendance")
        .select("student_id, date, masuk_status, late_status, notes, location_lat, location_lng")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("student_id", studentIds)
        .order("date");

      const countMap: Record<string, Record<string, number>> = {};
      const notesMap: Record<string, string[]> = {};
      const mapelMap: Record<string, string[]> = {};

      attDetail?.forEach((a: AttendanceDetail & { late_status?: string | null }) => {
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

      const { data: subjectAttData } = await supabase
        .from("subject_attendances")
        .select("student_id, date, log")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("student_id", studentIds);

      subjectAttData?.forEach((sa: any) => {
        if (sa.log && Array.isArray(sa.log)) {
          const teacherMap: Record<string, string> = {};
          sa.log.forEach((l: any) => { teacherMap[l.teacher_name] = l.status; });
          const summary = Object.entries(teacherMap)
            .map(([tName, tStatus]) => `${tName}: ${tStatus === "hadir" ? "H" : tStatus === "terlambat" ? "T" : tStatus === "sakit" ? "S" : tStatus === "izin" ? "I" : tStatus === "dispen" ? "D" : tStatus === "tidak_hadir" ? "TH" : "A"}`)
            .join(", ");
          if (summary) {
            if (!mapelMap[sa.student_id]) mapelMap[sa.student_id] = [];
            mapelMap[sa.student_id].push(`[${formatDate(sa.date)}] ${summary}`);
          }
        }
      });

      const schoolDays = countSchoolDays(startDate, endDate, holidays);

      const rows = recapData.map((r, i) => {
        const counts = countMap[r.student_id] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        const computedAlpa = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
        const keterangan = (notesMap[r.student_id] || []).join("\n") || "-";
        const mapelLog = (mapelMap[r.student_id] || []).join("\n") || "-";
        return {
          No: i + 1,
          NIS: r.nis,
          Nama: r.name,
          Kelas: r.className,
          Hadir: counts.hadir,
          Terlambat: counts.terlambat,
          Sakit: counts.sakit,
          Izin: counts.izin,
          Dispen: counts.dispen,
          Alpa: computedAlpa,
          "Keterangan Sakit/Izin/Dispen/Alpa": keterangan,
          "Log Presensi Mapel": mapelLog,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
        { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 40 }, { wch: 50 }
      ];

      // Enable wrap text for keterangan and log mapel columns
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const cell1 = ws[XLSX.utils.encode_cell({ r, c: 10 })];
        const cell2 = ws[XLSX.utils.encode_cell({ r, c: 11 })];
        if (cell1) cell1.s = { alignment: { wrapText: true, vertical: "top" } };
        if (cell2) cell2.s = { alignment: { wrapText: true, vertical: "top" } };
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

  // ==================== EXPORT 3: BULANAN ====================
  async function exportBulanan() {
    setExporting(true);
    setShowMonthForm(false);
    try {
      const startYear = yearFrom;
      const startMonth = monthFrom;
      const endYear = yearTo;
      const endMonth = monthTo;

      let studentIds = recapData.map((r) => r.student_id);
      if (studentIds.length === 0) { setExporting(false); return; }

      // Calculate date range
      const rangeStart = formatDateLocal(new Date(startYear, startMonth, 1));
      const rangeEnd = formatDateLocal(new Date(endYear, endMonth + 1, 0));

      const { data: attDetail } = await supabase
        .from("attendance")
        .select("student_id, date, masuk_status, late_status, notes")
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .in("student_id", studentIds)
        .order("date");

      // Build per-student per-month counts
      const monthCounts: Record<string, Record<string, { hadir: number; terlambat: number; sakit: number; izin: number; dispen: number; alpa: number }>> = {};
      const monthNotes: Record<string, Record<string, string[]>> = {};
      const monthMapel: Record<string, Record<string, string[]>> = {};

      attDetail?.forEach((a: AttendanceDetail & { late_status?: string | null }) => {
        const d = new Date(a.date);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        const sId = a.student_id;

        if (!monthCounts[sId]) monthCounts[sId] = {};
        if (!monthCounts[sId][mKey]) monthCounts[sId][mKey] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        if (a.masuk_status === 'hadir') {
          monthCounts[sId][mKey].hadir++;
          if (a.late_status === 'terlambat') monthCounts[sId][mKey].terlambat++;
        } else if (a.masuk_status === 'sakit') monthCounts[sId][mKey].sakit++;
        else if (a.masuk_status === 'izin') monthCounts[sId][mKey].izin++;
        else if (a.masuk_status === 'dispen') monthCounts[sId][mKey].dispen++;
        else if (a.masuk_status === 'alpa') monthCounts[sId][mKey].alpa++;

        if (a.masuk_status === "sakit" || a.masuk_status === "izin" || a.masuk_status === "dispen" || a.masuk_status === "alpa") {
          if (!monthNotes[sId]) monthNotes[sId] = {};
          if (!monthNotes[sId][mKey]) monthNotes[sId][mKey] = [];
          const label = a.masuk_status === "sakit" ? "Sakit" : a.masuk_status === "izin" ? "Izin" : a.masuk_status === "dispen" ? "Dispen" : "Alpa";
          const text = a.notes ? `${formatDate(a.date)}: ${label} - ${a.notes}` : `${formatDate(a.date)}: ${label}`;
          monthNotes[sId][mKey].push(text);
        }
      });

      const { data: subjectAttData } = await supabase
        .from("subject_attendances")
        .select("student_id, date, log")
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .in("student_id", studentIds);

      subjectAttData?.forEach((sa: any) => {
        if (sa.log && Array.isArray(sa.log)) {
          const teacherMap: Record<string, string> = {};
          sa.log.forEach((l: any) => { teacherMap[l.teacher_name] = l.status; });
          const summary = Object.entries(teacherMap)
            .map(([tName, tStatus]) => `${tName}: ${tStatus === "hadir" ? "H" : tStatus === "terlambat" ? "T" : tStatus === "sakit" ? "S" : tStatus === "izin" ? "I" : tStatus === "dispen" ? "D" : tStatus === "tidak_hadir" ? "TH" : "A"}`)
            .join(", ");
          if (summary) {
            const d = new Date(sa.date);
            const mKey = `${d.getFullYear()}-${d.getMonth()}`;
            const sId = sa.student_id;
            if (!monthMapel[sId]) monthMapel[sId] = {};
            if (!monthMapel[sId][mKey]) monthMapel[sId][mKey] = [];
            monthMapel[sId][mKey].push(`[${formatDate(sa.date)}] ${summary}`);
          }
        }
      });

      const wb = XLSX.utils.book_new();

      // Build month keys in range
      const monthKeys: { key: string; label: string; year: number; month: number }[] = [];
      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 0;
        const mEnd = y === endYear ? endMonth : 11;
        for (let m = mStart; m <= mEnd; m++) {
          monthKeys.push({ key: `${y}-${m}`, label: `${MONTHS[m]} ${y}`, year: y, month: m });
        }
      }

      // Pre-compute school days per month for alpa calculation
      const monthSchoolDays: Record<string, number> = {};
      for (const mk of monthKeys) {
        const mStart = formatDateLocal(new Date(mk.year, mk.month, 1));
        const mEnd = formatDateLocal(new Date(mk.year, mk.month + 1, 0));
        monthSchoolDays[mk.key] = countSchoolDays(mStart, mEnd, holidays);
      }

      // === SHEETS PER BULAN ===
      for (const mk of monthKeys) {
        const schoolDays = monthSchoolDays[mk.key];

        const rows = recapData.map((r, i) => {
          const counts = monthCounts[r.student_id]?.[mk.key] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
          const computedAlpa = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
          const notes = (monthNotes[r.student_id]?.[mk.key] || []).join("\n") || "-";
          const mapelLog = (monthMapel[r.student_id]?.[mk.key] || []).join("\n") || "-";
          return {
            No: i + 1,
            NIS: r.nis,
            Nama: r.name,
            Kelas: r.className,
            Hadir: counts.hadir,
            Terlambat: counts.terlambat,
            Sakit: counts.sakit,
            Izin: counts.izin,
            Dispen: counts.dispen,
            Alpa: computedAlpa,
            "Keterangan Sakit/Izin/Dispen/Alpa": notes,
            "Log Presensi Mapel": mapelLog,
          };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
          { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
          { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
          { wch: 40 }, { wch: 50 }
        ];

        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const cell1 = ws[XLSX.utils.encode_cell({ r, c: 10 })];
          const cell2 = ws[XLSX.utils.encode_cell({ r, c: 11 })];
          if (cell1) cell1.s = { alignment: { wrapText: true, vertical: "top" } };
          if (cell2) cell2.s = { alignment: { wrapText: true, vertical: "top" } };
        }

        XLSX.utils.book_append_sheet(wb, ws, mk.label);
      }
      // === SHEET TERAKHIR: REKAP TAHUNAN ===
      const totalCols = 4 + monthKeys.length * 6; // No, NIS, Nama, Kelas + (6 per month)
      const headerRow1: (string | number)[][] = [[]];
      const headerRow2: (string | number)[][] = [[]];
      const merges: XLSX.Range[] = [];

      // Row 1: fixed cols
      headerRow1[0] = [];
      headerRow2[0] = [];

      // Merges for No, NIS, Nama, Kelas (row 1+2)
      merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }); // No
      merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }); // NIS
      merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }); // Nama
      merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }); // Kelas

      headerRow1[0][0] = "No";
      headerRow1[0][1] = "NIS";
      headerRow1[0][2] = "Nama";
      headerRow1[0][3] = "Kelas";

      headerRow2[0][0] = "";
      headerRow2[0][1] = "";
      headerRow2[0][2] = "";
      headerRow2[0][3] = "";

      // Row 1: month headers (merge 6 cols each)
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

      // Data rows
      const dataRows: (string | number)[][] = recapData.map((r, i) => {
        const row: (string | number)[] = [i + 1, r.nis, r.name, r.className];
        monthKeys.forEach((mk) => {
          const counts = monthCounts[r.student_id]?.[mk.key] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
          const schoolDays = monthSchoolDays[mk.key];
          const computedAlpa = Math.max(0, schoolDays - (counts.hadir + counts.sakit + counts.izin + counts.dispen));
          row.push(counts.hadir, counts.terlambat, counts.sakit, counts.izin, counts.dispen, computedAlpa);
        });
        return row;
      });

      const allRows = [...headerRow1, ...headerRow2, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!merges"] = merges;

      // Set col widths
      const colWidths: { wch: number }[] = [
        { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
      ];
      monthKeys.forEach(() => {
        colWidths.push({ wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 });
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Rekap Tahunan");

      XLSX.writeFile(wb, `rekap-presensi-${MONTHS[startMonth]}-${startYear}-sd-${MONTHS[endMonth]}-${endYear}.xlsx`);
      toast.success("File rekap bulanan berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  function getStatusBadge(status: string, count: number) {
    const colors: Record<string, string> = {
      hadir: "text-success font-bold", terlambat: "text-warning font-bold",
      sakit: "text-muted-foreground", izin: "text-muted-foreground",
      dispen: "text-info font-bold", alpa: "text-destructive font-bold",
    };
    return <span className={colors[status] || ""}>{count}</span>;
  }



  return (
    <SkeletonWrapper loading={loading && recapData.length === 0} skeleton={<RekapSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Rekap Presensi</h1>
          <p className="text-sm text-muted-foreground">Laporan kehadiran siswa</p>
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
            <label className="text-xs font-bold text-muted-foreground">Kelas</label>
            <div className="clay-input h-10 px-4 rounded-xl flex items-center text-sm font-medium">
              {selectedClassName}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground block mb-1">Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="clay-input px-4 py-2 rounded-xl outline-none" />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground block mb-1">Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="clay-input px-4 py-2 rounded-xl outline-none" />
          </div>
        </div>

        {/* Export Dropdown */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="relative inline-block">
            <button
              ref={btnRef}
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="clay-button px-4 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Mengekspor..." : "Export Excel"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <div ref={menuRef} className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-border/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={exportHarian}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-bold">Ekspor Harian</div>
                    <div className="text-xs text-muted-foreground">Presensi hari ini</div>
                  </div>
                </button>
                <button
                  onClick={exportFilter}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-bold">Ekspor Hasil Filter</div>
                    <div className="text-xs text-muted-foreground">Rekap sesuai tanggal</div>
                  </div>
                </button>
                <button
                  onClick={() => { setShowMonthForm(true); setShowExportMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-bold">Ekspor Bulanan</div>
                    <div className="text-xs text-muted-foreground">Multi-sheet per bulan</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="clay-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-bold text-foreground">
            Rekap {formatDate(startDate)} - {formatDate(endDate)}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">NIS</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Kelas</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Hadir</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Terlambat</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Sakit</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Izin</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Dispen</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Alpa</th>
              </tr>
            </thead>
            <tbody>
              {recapData.map((r) => (
                <tr key={r.student_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                  <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{r.nis}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.className}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("hadir", r.hadir)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("terlambat", r.terlambat)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("sakit", r.sakit)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("izin", r.izin)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("dispen", r.dispen)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("alpa", r.alpa)}</td>
                </tr>
              ))}
              {recapData.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada data untuk rentang tanggal ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Month Form Popup */}
      {showMonthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-150">
          <div className="clay-card p-6 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold text-foreground">Ekspor Presensi Bulanan</h3>
              <button onClick={() => setShowMonthForm(false)} className="p-1 hover:bg-muted rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Dari Bulan</label>
                  <select
                    value={monthFrom}
                    onChange={(e) => setMonthFrom(Number(e.target.value))}
                    className="clay-input px-4 py-2.5 rounded-xl outline-none w-full text-sm"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Tahun</label>
                  <select
                    value={yearFrom}
                    onChange={(e) => setYearFrom(Number(e.target.value))}
                    className="clay-input px-4 py-2.5 rounded-xl outline-none w-full text-sm"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Sampai Bulan</label>
                  <select
                    value={monthTo}
                    onChange={(e) => setMonthTo(Number(e.target.value))}
                    className="clay-input px-4 py-2.5 rounded-xl outline-none w-full text-sm"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Tahun</label>
                  <select
                    value={yearTo}
                    onChange={(e) => setYearTo(Number(e.target.value))}
                    className="clay-input px-4 py-2.5 rounded-xl outline-none w-full text-sm"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMonthForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={exportBulanan}
                disabled={exporting}
                className="flex-1 clay-button py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
              >
                {exporting ? "Mengekspor..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SkeletonWrapper>
  );
}
