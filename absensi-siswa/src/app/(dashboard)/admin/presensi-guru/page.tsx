"use client";

import { useEffect, useState, useMemo, useRef, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Clock, CheckCircle, XCircle, Calendar, RefreshCw, CalendarOff, ArrowLeft, Download, Filter, CalendarDays, BarChart3, ChevronDown, X } from "lucide-react";
import { formatDate, formatTime, countSchoolDays, isSchoolDay, formatDateLocal } from "@/lib/helpers";
import { fetchHolidays } from "@/lib/holidays";
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

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface TeacherAttendance {
  id: string;
  teacher_id: string;
  date: string;
  login_time: string;
  logout_time: string | null;
  status: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
}

interface GuruRecapData {
  teacher_id: string;
  name: string;
  email: string;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
}

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    hadir: { bg: "bg-success/10 border-success/20", text: "text-success", icon: <CheckCircle className="h-4 w-4" /> },
    terlambat: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: <Clock className="h-4 w-4" /> },
    izin: { bg: "bg-secondary/10 border-secondary/20", text: "text-secondary-foreground", icon: <Calendar className="h-4 w-4" /> },
    alpa: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", icon: <XCircle className="h-4 w-4" /> },
  };
  const labels: Record<string, string> = { hadir: "Hadir", terlambat: "Terlambat", izin: "Izin", alpa: "Alpa" };
  const c = config[status] || config.alpa;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border-2 rounded-xl whitespace-nowrap ${c.bg} ${c.text}`}>
      {c.icon} {labels[status] || status}
    </span>
  );
});

function PresensiGuruSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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

export default function AdminPresensiGuruPage() {
  const supabase = createClient();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<GuruRecapData[]>([]);
  const [startDate, setStartDate] = useState(() =>
    formatDateLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(() => formatDateLocal());
  const [filterStatus, setFilterStatus] = useState("all");
  const [history, setHistory] = useState<(TeacherAttendance & { teacher_name: string })[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTeacherId, setHistoryTeacherId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [todayIsSchoolDay, setTodayIsSchoolDay] = useState(true);
  const [holidayName, setHolidayName] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthForm, setShowMonthForm] = useState(false);
  const [monthFrom, setMonthFrom] = useState(() => new Date().getMonth());
  const [yearFrom, setYearFrom] = useState(() => new Date().getFullYear());
  const [monthTo, setMonthTo] = useState(() => new Date().getMonth());
  const [yearTo, setYearTo] = useState(() => new Date().getFullYear());

  useEffect(() => { fetchRecap(); }, [startDate, endDate, holidays]);
  useEffect(() => { if (showHistory && historyTeacherId) fetchHistory(); }, [showHistory, historyTeacherId]);

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

  useEffect(() => {
    async function checkHoliday() {
      const today = new Date();
      const todayStr = formatDateLocal(today);
      const fetchedHolidays = await fetchHolidays(today.getFullYear());
      setHolidays(fetchedHolidays);
      const schoolDay = isSchoolDay(todayStr, fetchedHolidays);
      setTodayIsSchoolDay(schoolDay);
      if (!schoolDay) {
        const dayName = today.toLocaleDateString("id-ID", { weekday: "long" });
        setHolidayName(dayName === "Minggu" ? "Hari Minggu" : dayName === "Sabtu" ? "Hari Sabtu" : `Hari ${dayName}`);
      }
    }
    checkHoliday();
  }, []);

  async function fetchRecap() {
    setLoading(true);

    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("role", "guru")
      .order("name");

    if (!usersData) { setRecapData([]); setLoading(false); return; }

    const teacherIds = usersData.map((u: { id: string }) => u.id);
    if (teacherIds.length === 0) { setRecapData([]); setLoading(false); return; }

    const { data: attData } = await supabase
      .from("teacher_attendance")
      .select("teacher_id, status")
      .gte("date", startDate)
      .lte("date", endDate)
      .in("teacher_id", teacherIds);

    const countMap: Record<string, Record<string, number>> = {};
    attData?.forEach((a: { teacher_id: string; status: string }) => {
      if (!countMap[a.teacher_id]) {
        countMap[a.teacher_id] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
      }
      if (a.status in countMap[a.teacher_id]) {
        countMap[a.teacher_id][a.status]++;
      }
    });

    const schoolDays = countSchoolDays(startDate, endDate, holidays);

    const recap: GuruRecapData[] = usersData.map((u: { id: string; name: string; email: string }) => {
      const counts = countMap[u.id] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
      return { teacher_id: u.id, name: u.name, email: u.email, ...counts };
    });

    setRecapData(recap);
    setLoading(false);
  }

  async function fetchHistory() {
    if (!historyTeacherId) return;
    const { data } = await supabase
      .from("teacher_attendance")
      .select("*, users(name)")
      .eq("teacher_id", historyTeacherId)
      .order("date", { ascending: false })
      .limit(30);

    const result = (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      teacher_name: (d.users as { name: string })?.name || "Unknown",
    }));

    setHistory(result);
  }

  const filteredRecap = useMemo(() => {
    if (filterStatus === "all") return recapData;
    return recapData.filter((r) => {
      if (filterStatus === "hadir") return r.hadir > 0;
      if (filterStatus === "terlambat") return r.terlambat > 0;
      if (filterStatus === "sakit") return r.sakit > 0;
      if (filterStatus === "izin") return r.izin > 0;
      if (filterStatus === "alpa") return r.alpa > 0;
      return true;
    });
  }, [recapData, filterStatus]);

  const stats = useMemo(() => {
    const total = recapData.length;
    const totalHadir = recapData.reduce((sum, r) => sum + r.hadir, 0);
    const totalTerlambat = recapData.reduce((sum, r) => sum + r.terlambat, 0);
    const totalAlpa = recapData.reduce((sum, r) => sum + r.alpa, 0);
    return { total, totalHadir, totalTerlambat, totalAlpa };
  }, [recapData]);

  // ==================== EXPORT 1: HARIAN ====================
  async function exportHarian() {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const today = formatDateLocal();

      const { data: attData } = await supabase
        .from("teacher_attendance")
        .select("*, users(name)")
        .eq("date", today);

      const statusMap: Record<string, string> = {
        hadir: "Hadir", terlambat: "Terlambat", sakit: "Sakit", izin: "Izin", alpa: "Alpa",
      };

      const rows = (attData || []).map((a: Record<string, unknown>, i: number) => ({
        No: i + 1,
        Nama: (a.users as { name: string })?.name || "Unknown",
        Status: statusMap[a.status as string] || a.status,
        "Jam Masuk": a.login_time ? formatTime(a.login_time as string) : "-",
        "Jam Keluar": a.logout_time ? formatTime(a.logout_time as string) : "-",
        Lokasi: a.location_lat && a.location_lng ? `https://www.google.com/maps?q=${a.location_lat},${a.location_lng}` : "-",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, "Presensi Guru Harian");
      XLSX.writeFile(wb, `presensi-guru-${today}.xlsx`);
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
      const rows = filteredRecap.map((r, i) => ({
        No: i + 1,
        Nama: r.name,
        Email: r.email,
        Hadir: r.hadir,
        Terlambat: r.terlambat,
        Sakit: r.sakit,
        Izin: r.izin,
        Alpa: r.alpa,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 }, { wch: 20 }, { wch: 25 },
        { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Presensi Guru");
      XLSX.writeFile(wb, `rekap-presensi-guru-${startDate}-sd-${endDate}.xlsx`);
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
      const rangeStart = formatDateLocal(new Date(yearFrom, monthFrom, 1));
      const rangeEnd = formatDateLocal(new Date(yearTo, monthTo + 1, 0));

      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "guru")
        .order("name");

      if (!usersData || usersData.length === 0) { setExporting(false); return; }

      const teacherIds = usersData.map((u: { id: string }) => u.id);

      const { data: attData } = await supabase
        .from("teacher_attendance")
        .select("teacher_id, date, status")
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .in("teacher_id", teacherIds);

      const wb = XLSX.utils.book_new();

      const months: { year: number; month: number; label: string }[] = [];
      let y = yearFrom, m = monthFrom;
      while (y < yearTo || (y === yearTo && m <= monthTo)) {
        months.push({ year: y, month: m, label: `${MONTHS[m]} ${y}` });
        m++;
        if (m > 11) { m = 0; y++; }
      }

      for (const { year, month, label } of months) {
        const mStart = formatDateLocal(new Date(year, month, 1));
        const mEnd = formatDateLocal(new Date(year, month + 1, 0));

        const monthAtts = (attData || []).filter((a: { date: string }) => a.date >= mStart && a.date <= mEnd);

        const countMap: Record<string, Record<string, number>> = {};
        monthAtts.forEach((a: { teacher_id: string; status: string }) => {
          if (!countMap[a.teacher_id]) countMap[a.teacher_id] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
          if (a.status in countMap[a.teacher_id]) countMap[a.teacher_id][a.status]++;
        });

        const mSchoolDays = countSchoolDays(mStart, mEnd, holidays);

        const rows = usersData.map((u: { id: string; name: string; email: string }, i: number) => {
          const counts = countMap[u.id] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
          return {
            No: i + 1,
            Nama: u.name,
            Email: u.email,
            Hadir: counts.hadir,
            Terlambat: counts.terlambat,
            Sakit: counts.sakit,
            Izin: counts.izin,
            Alpa: counts.alpa,
          };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
        XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
      }

      const annualCountMap: Record<string, Record<string, Record<string, number>>> = {};
      (attData || []).forEach((a: { teacher_id: string; date: string; status: string }) => {
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!annualCountMap[a.teacher_id]) annualCountMap[a.teacher_id] = {};
        if (!annualCountMap[a.teacher_id][key]) annualCountMap[a.teacher_id][key] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
        if (a.status in annualCountMap[a.teacher_id][key]) annualCountMap[a.teacher_id][key][a.status]++;
      });

      const annualRows = usersData.map((u: { id: string; name: string; email: string }, i: number) => {
        const row: Record<string, string | number> = { No: i + 1, Nama: u.name, Email: u.email };
        for (const { year, month, label } of months) {
          const key = `${year}-${month}`;
          const counts = annualCountMap[u.id]?.[key] || { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
          row[`${label} Hadir`] = counts.hadir;
          row[`${label} Terlambat`] = counts.terlambat;
          row[`${label} Sakit`] = counts.sakit;
          row[`${label} Izin`] = counts.izin;
          row[`${label} Alpa`] = counts.alpa;
        }
        return row;
      });

      const annualWs = XLSX.utils.json_to_sheet(annualRows);
      XLSX.utils.book_append_sheet(wb, annualWs, "Rekap Tahunan");

      XLSX.writeFile(wb, `rekap-presensi-guru-${MONTHS[monthFrom]}-${yearFrom}-sd-${MONTHS[monthTo]}-${yearTo}.xlsx`);
      toast.success("File Excel rekap bulanan berhasil diunduh!");
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
      alpa: "text-destructive font-bold",
    };
    return <span className={colors[status] || ""}>{count}</span>;
  }

  return (
    <SkeletonWrapper loading={loading} skeleton={<PresensiGuruSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Presensi Guru</h1>
            <p className="text-sm text-muted-foreground">Rekap kehadiran guru</p>
          </div>
        </div>
        <button onClick={fetchRecap} className="clay-button px-4 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Holiday Banner */}
      {!todayIsSchoolDay && (
        <div className="clay-card p-4 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <CalendarOff className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Hari libur</p>
              <p className="text-xs text-muted-foreground">{holidayName || "hari libur / tanggal merah"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clay-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl"><Users className="h-5 w-5 text-primary" /></div>
            <p className="text-sm font-bold text-muted-foreground">Total Guru</p>
          </div>
          <p className="text-3xl font-heading font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="clay-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-xl"><CheckCircle className="h-5 w-5 text-success" /></div>
            <p className="text-sm font-bold text-muted-foreground">Total Hadir</p>
          </div>
          <p className="text-3xl font-heading font-bold text-success">{stats.totalHadir}</p>
        </div>
        <div className="clay-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 rounded-xl"><Clock className="h-5 w-5 text-warning" /></div>
            <p className="text-sm font-bold text-muted-foreground">Total Terlambat</p>
          </div>
          <p className="text-3xl font-heading font-bold text-warning">{stats.totalTerlambat}</p>
        </div>
        <div className="clay-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-xl"><XCircle className="h-5 w-5 text-destructive" /></div>
            <p className="text-sm font-bold text-muted-foreground">Total Alpa</p>
          </div>
          <p className="text-3xl font-heading font-bold text-destructive">{stats.totalAlpa}</p>
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
            <label className="text-xs font-bold text-muted-foreground">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="clay-input px-4 py-2 rounded-xl outline-none"
            />
          </div>
          <div className="space-y-2.5 flex-1">
            <label className="text-xs font-bold text-muted-foreground">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="clay-input px-4 py-2 rounded-xl outline-none"
            />
          </div>
          <div className="space-y-2.5 flex-1">
            <label className="text-xs font-bold text-muted-foreground">Status</label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(String(v || "all"))}>
              <SelectTrigger className="cursor-pointer clay-input h-10 px-4 rounded-xl border-0 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Semua Status</SelectItem>
                <SelectItem value="hadir" className="cursor-pointer">Hadir</SelectItem>
                <SelectItem value="terlambat" className="cursor-pointer">Terlambat</SelectItem>
                <SelectItem value="sakit" className="cursor-pointer">Sakit</SelectItem>
                <SelectItem value="izin" className="cursor-pointer">Izin</SelectItem>
                <SelectItem value="alpa" className="cursor-pointer">Alpa</SelectItem>
              </SelectContent>
            </Select>
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
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap w-10">No</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Email</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Hadir</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Terlambat</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Sakit</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Izin</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Alpa</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecap.map((r, i) => (
                <tr key={r.teacher_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("hadir", r.hadir)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("terlambat", r.terlambat)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("sakit", r.sakit)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("izin", r.izin)}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge("alpa", r.alpa)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setHistoryTeacherId(r.teacher_id); setShowHistory(true); }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Riwayat
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecap.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Tidak ada data guru
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-heading font-bold text-foreground">Riwayat Presensi</h2>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-4">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada riwayat</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="clay-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">{formatDate(h.date)}</span>
                        <StatusBadge status={h.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Masuk: {h.login_time ? formatTime(h.login_time) : "-"}</span>
                        <span>Keluar: {h.logout_time ? formatTime(h.logout_time) : "-"}</span>
                      </div>
                      {h.location_lat && h.location_lng && (
                        <a
                          href={`https://www.google.com/maps?q=${h.location_lat},${h.location_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          Lihat Lokasi
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
