"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Clock,
  MapPin,
  MapPinOff,
  CheckCircle,
  Loader2,
  LogOut,
  LogIn,
  HeartPulse,
  FileText,
  ListChecks,
  CalendarOff,
  RefreshCw,
} from "lucide-react";
import { getCurrentPosition, isWithinSchool } from "@/lib/geofencing";
import { fetchHolidays, getHolidayName } from "@/lib/holidays";
import { isSchoolDay, formatDateLocal, formatTime, formatDate } from "@/lib/helpers";
import { SkeletonCard, SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import SkeletonWrapper from "@/components/SkeletonWrapper";

interface Settings {
  morning_start: string;
  late_threshold: string;
  afternoon_start: string;
  afternoon_end: string;
  auto_late: string;
  school_lat: string;
  school_lng: string;
  geofence_radius: string;
}

function ProfilSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-6 w-56 bg-muted animate-pulse rounded" />
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-10 w-full bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
      <div>
        <SkeletonTable rows={8} cols={4} />
      </div>
    </>
  );
}

export default function TenagaKependidikanPresensiPage() {
  const supabase = createClient();
  const { userId } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cachedPosition, setCachedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [todayIsSchoolDay, setTodayIsSchoolDay] = useState<boolean>(true);
  const [holidayName, setHolidayName] = useState<string | null>(null);

  const [todayRecord, setTodayRecord] = useState<Record<string, any> | null>(null);
  const [markingMasuk, setMarkingMasuk] = useState(false);
  const [markingPulang, setMarkingPulang] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>("idle");
  const [markingSakit, setMarkingSakit] = useState(false);
  const [markingIzin, setMarkingIzin] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const nowHHMM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();
  const isBeforeHours = settings ? nowHHMM < settings.morning_start : false;
  const isAfterHours = settings ? nowHHMM > settings.afternoon_end : false;
  const timeDisabled = todayIsSchoolDay && (isBeforeHours || isAfterHours);
  const timeDisabledReason = isBeforeHours ? "Belum jam masuk" : isAfterHours ? "Jam pulang sudah berakhir" : "";

  const [rekapStartDate, setRekapStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [rekapEndDate, setRekapEndDate] = useState(formatDateLocal());
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const today = formatDateLocal();
      const year = new Date().getFullYear();

      const [settingsResult, fetchedHolidays, attResult] = await Promise.all([
        supabase.from("settings").select("key, value"),
        fetchHolidays(year),
        supabase.from("teacher_attendance").select("id, teacher_id, date, login_time, logout_time, status, location_lat, location_lng").eq("teacher_id", userId).eq("date", today).maybeSingle(),
      ]);

      const { data: settingsData } = settingsResult;
      if (settingsData) {
        const map: Record<string, string> = {};
        settingsData.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));
        setSettings(map as unknown as Settings);
      }

      setHolidays(fetchedHolidays);
      const schoolDay = isSchoolDay(today, fetchedHolidays);
      setTodayIsSchoolDay(schoolDay);
      if (!schoolDay) {
        const name = await getHolidayName(today);
        setHolidayName(name);
      }

      const { data: teacherAtt } = attResult;
      setTodayRecord(teacherAtt);

      setPageLoading(false);
    }
    if (userId) init();
  }, [supabase, userId]);

  const fetchGPS = useCallback(async () => {
    if (!settings) return;
    setGpsStatus("checking");
    const pos = await getCurrentPosition();
    if (!pos.success) {
      setGpsStatus(pos.error === "denied" ? "denied" : pos.error === "timeout" ? "timeout" : "unavailable");
      return;
    }
    setCachedPosition({ lat: pos.lat, lng: pos.lng });
    const schoolLat = parseFloat(settings.school_lat || "-7.4212");
    const schoolLng = parseFloat(settings.school_lng || "109.4418");
    const radius = parseFloat(settings.geofence_radius || "100");
    setGpsStatus(
      isWithinSchool(pos.lat, pos.lng, schoolLat, schoolLng, radius)
        ? "valid"
        : "invalid"
    );
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!settings) return;
      await fetchGPS();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [settings, fetchGPS]);

  function isLate(): boolean {
    if (!settings || settings.auto_late !== "true") return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return currentTime > settings.late_threshold;
  }

  async function refreshAttendance() {
    if (!userId) return;
    const today = formatDateLocal();
    const { data: refreshed } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", userId)
      .eq("date", today)
      .maybeSingle();
    setTodayRecord(refreshed);
  }

  const handleMarkMasuk = useCallback(async () => {
    if (timeDisabled) {
      toast.warning(timeDisabledReason || "Di luar jam presensi.");
      return;
    }
    if (gpsStatus !== "valid") {
      toast.warning("Pastikan GPS aktif dan Anda berada di area sekolah.");
      return;
    }
    if (!todayRecord?.login_time) {
      setMarkingMasuk(true);
      const pos = cachedPosition;
      const lat = pos?.lat ?? null;
      const lng = pos?.lng ?? null;
      if (!userId) { setMarkingMasuk(false); return; }
      const today = formatDateLocal();
      const { error } = await supabase.from("teacher_attendance").upsert(
        {
          teacher_id: userId,
          date: today,
          login_time: new Date().toISOString(),
          status: isLate() ? "terlambat" : "hadir",
          location_lat: lat,
          location_lng: lng,
        },
        { onConflict: "teacher_id,date" }
      );
      if (error) {
        console.error("Mark masuk error:", error);
        toast.error("Gagal mencatat presensi masuk.");
        setMarkingMasuk(false);
        return;
      }
      await refreshAttendance();
      toast.success("Presensi masuk berhasil dicatat!");
      setMarkingMasuk(false);
    }
  }, [supabase, cachedPosition, todayRecord, gpsStatus, userId, timeDisabled, timeDisabledReason]);

  const handleMarkPulang = useCallback(async () => {
    if (timeDisabled) {
      toast.warning(timeDisabledReason || "Di luar jam presensi.");
      return;
    }
    if (todayRecord?.login_time && !todayRecord?.logout_time) {
      setMarkingPulang(true);
      if (!userId) { setMarkingPulang(false); return; }
      const today = formatDateLocal();
      const { error } = await supabase
        .from("teacher_attendance")
        .update({ logout_time: new Date().toISOString() })
        .eq("teacher_id", userId)
        .eq("date", today);
      if (error) {
        console.error("Mark pulang error:", error);
        toast.error("Gagal mencatat presensi pulang.");
        setMarkingPulang(false);
        return;
      }
      await refreshAttendance();
      toast.success("Presensi pulang berhasil dicatat!");
      setMarkingPulang(false);
    }
  }, [supabase, todayRecord, userId, timeDisabled, timeDisabledReason]);

  const handleMarkSakit = useCallback(async () => {
    if (timeDisabled) {
      toast.warning(timeDisabledReason || "Di luar jam presensi.");
      return;
    }
    if (todayRecord?.login_time) return;
    setMarkingSakit(true);
    const pos = cachedPosition;
    const lat = pos?.lat ?? null;
    const lng = pos?.lng ?? null;
    if (!userId) { setMarkingSakit(false); return; }
    const today = formatDateLocal();
    const { error } = await supabase.from("teacher_attendance").upsert(
      {
        teacher_id: userId,
        date: today,
        login_time: new Date().toISOString(),
        status: "sakit",
        location_lat: lat,
        location_lng: lng,
      },
      { onConflict: "teacher_id,date" }
    );
    if (error) {
      console.error("Mark sakit error:", error);
      toast.error("Gagal mencatat presensi sakit.");
      setMarkingSakit(false);
      return;
    }
    await refreshAttendance();
    toast.success("Presensi sakit berhasil dicatat!");
    setMarkingSakit(false);
  }, [supabase, cachedPosition, todayRecord, userId, timeDisabled, timeDisabledReason]);

  const handleMarkIzin = useCallback(async () => {
    if (timeDisabled) {
      toast.warning(timeDisabledReason || "Di luar jam presensi.");
      return;
    }
    if (todayRecord?.login_time) return;
    setMarkingIzin(true);
    const pos = cachedPosition;
    const lat = pos?.lat ?? null;
    const lng = pos?.lng ?? null;
    if (!userId) { setMarkingIzin(false); return; }
    const today = formatDateLocal();
    const { error } = await supabase.from("teacher_attendance").upsert(
      {
        teacher_id: userId,
        date: today,
        login_time: new Date().toISOString(),
        status: "izin",
        location_lat: lat,
        location_lng: lng,
      },
      { onConflict: "teacher_id,date" }
    );
    if (error) {
      console.error("Mark izin error:", error);
      toast.error("Gagal mencatat presensi izin.");
      setMarkingIzin(false);
      return;
    }
    await refreshAttendance();
    toast.success("Presensi izin berhasil dicatat!");
    setMarkingIzin(false);
  }, [supabase, cachedPosition, todayRecord, userId, timeDisabled, timeDisabledReason]);

  const hasCheckedIn = !!todayRecord?.login_time;
  const hasCheckedOut = !!todayRecord?.logout_time;
  const currentStatus = todayRecord?.status || "";
  const isSakitOrIzin = currentStatus === "sakit" || currentStatus === "izin";

  function todayStatusBadge(status: string) {
    const variants: Record<string, string> = {
      hadir: "bg-green-100 text-green-600",
      terlambat: "bg-amber-100 text-amber-600",
      sakit: "bg-blue-100 text-blue-600",
      izin: "bg-purple-100 text-purple-600",
      alpa: "bg-red-100 text-red-600",
    };
    const labels: Record<string, string> = {
      hadir: "Hadir",
      terlambat: "Terlambat",
      sakit: "Sakit",
      izin: "Izin",
      alpa: "Alpa",
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${variants[status] || "bg-gray-100 text-gray-600"}`}>
        {labels[status] || status}
      </span>
    );
  }

  async function fetchRekap() {
    if (!userId) return;
    setRekapLoading(true);
    const { data } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", userId)
      .gte("date", rekapStartDate)
      .lte("date", rekapEndDate)
      .order("date", { ascending: false });
    setRekapData(data || []);
    setRekapLoading(false);
  }

  return (
    <SkeletonWrapper loading={pageLoading} skeleton={<ProfilSkeleton />}>
      <div className="space-y-6">
        {/* Holiday Banner */}
        {!todayIsSchoolDay && (
          <div className="clay-card p-6 border-2 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <CalendarOff className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Hari libur</h2>
                <p className="text-sm text-muted-foreground">{holidayName || "hari libur / tanggal merah"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Presensi Harian</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* GPS Status */}
        <div className="flex items-center gap-2 text-sm">
          {gpsStatus === "idle" || gpsStatus === "checking" ? (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Memuat lokasi...</span>
            </>
          ) : gpsStatus === "valid" ? (
            <>
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">Lokasi terdeteksi</span>
            </>
          ) : gpsStatus === "invalid" ? (
            <>
              <MapPinOff className="h-4 w-4 text-red-500" />
              <span className="text-red-500 font-medium">Lokasi: Di luar area sekolah</span>
            </>
          ) : gpsStatus === "timeout" ? (
            <>
              <MapPinOff className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600 font-medium">Sinyal GPS lemah</span>
            </>
          ) : gpsStatus === "denied" ? (
            <>
              <MapPinOff className="h-4 w-4 text-red-500" />
              <span className="text-red-500 font-medium">Izin lokasi ditolak</span>
            </>
          ) : (
            <>
              <MapPinOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">GPS tidak tersedia</span>
            </>
          )}
          {(gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied") && (
            <button
              onClick={fetchGPS}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Lagi
            </button>
          )}
        </div>

        {/* Presensi Hari Ini */}
        <div className="clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Presensi Hari Ini</h2>
          </div>

          {todayRecord ? (
            <div className="mb-4 p-4 bg-muted/30 rounded-2xl">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground font-medium">Status: </span>
                  {todayStatusBadge(todayRecord.status)}
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Masuk: </span>
                  <span className="font-medium">
                    {todayRecord.login_time ? formatTime(todayRecord.login_time) : "-"}
                  </span>
                </div>
                {!isSakitOrIzin && (
                  <div>
                    <span className="text-muted-foreground font-medium">Pulang: </span>
                    <span className="font-medium">
                      {todayRecord.logout_time ? formatTime(todayRecord.logout_time) : "Belum"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-muted/30 rounded-2xl text-center">
              <p className="text-muted-foreground text-sm">Belum melakukan presensi hari ini</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!isSakitOrIzin && (
              <button
                onClick={() => {
                  if (!hasCheckedIn && !markingMasuk && gpsStatus === "valid") setConfirmAction("masuk");
                }}
                disabled={hasCheckedIn || markingMasuk || gpsStatus !== "valid" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus !== "valid" ? "Aktifkan GPS untuk presensi" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  hasCheckedIn
                    ? "bg-success/10 text-success cursor-not-allowed"
                    : gpsStatus !== "valid" || timeDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : markingMasuk
                        ? "bg-primary/70 text-white cursor-wait"
                        : "bg-primary text-primary-foreground cursor-pointer clay-button"
                }`}
              >
                {hasCheckedIn ? (
                  <CheckCircle className="h-5 w-5" />
                ) : markingMasuk ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {hasCheckedIn
                  ? "Sudah Presensi Masuk"
                  : markingMasuk
                    ? "Memproses..."
                    : "Presensi Masuk"}
              </button>
            )}

            {!hasCheckedIn && (
              <button
                onClick={() => {
                  if (!markingSakit && gpsStatus !== "unavailable" && gpsStatus !== "timeout" && gpsStatus !== "denied") setConfirmAction("sakit");
                }}
                disabled={markingSakit || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" ? "Aktifkan GPS" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  isSakitOrIzin && currentStatus === "sakit"
                    ? "bg-blue-100 text-blue-600 cursor-not-allowed"
                    : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : markingSakit
                        ? "bg-blue-300 text-white cursor-wait"
                        : "bg-blue-100 text-blue-600 cursor-pointer"
                }`}
              >
                {isSakitOrIzin && currentStatus === "sakit" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : markingSakit ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <HeartPulse className="h-5 w-5" />
                )}
                {isSakitOrIzin && currentStatus === "sakit"
                  ? "Sudah Presensi Sakit"
                  : markingSakit
                    ? "Memproses..."
                    : "Sakit"}
              </button>
            )}

            {!hasCheckedIn && (
              <button
                onClick={() => {
                  if (!markingIzin && gpsStatus !== "unavailable" && gpsStatus !== "timeout" && gpsStatus !== "denied") setConfirmAction("izin");
                }}
                disabled={markingIzin || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" ? "Aktifkan GPS" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  isSakitOrIzin && currentStatus === "izin"
                    ? "bg-purple-100 text-purple-600 cursor-not-allowed"
                    : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : markingIzin
                        ? "bg-purple-300 text-white cursor-wait"
                        : "bg-purple-100 text-purple-600 cursor-pointer"
                }`}
              >
                {isSakitOrIzin && currentStatus === "izin" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : markingIzin ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                {isSakitOrIzin && currentStatus === "izin"
                  ? "Sudah Presensi Izin"
                  : markingIzin
                    ? "Memproses..."
                    : "Izin"}
              </button>
            )}

            {!isSakitOrIzin && (
              <button
                onClick={() => {
                  if (hasCheckedIn && !hasCheckedOut && !markingPulang && gpsStatus === "valid") setConfirmAction("pulang");
                }}
                disabled={!hasCheckedIn || hasCheckedOut || markingPulang || gpsStatus !== "valid" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus !== "valid" ? "Aktifkan GPS untuk presensi" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  !hasCheckedIn || hasCheckedOut || gpsStatus !== "valid" || timeDisabled
                    ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                    : markingPulang
                      ? "bg-amber-300 text-white cursor-wait"
                      : "bg-amber-100 text-amber-600 cursor-pointer"
                }`}
              >
                {hasCheckedOut ? (
                  <CheckCircle className="h-5 w-5" />
                ) : markingPulang ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                {hasCheckedOut
                  ? "Sudah Presensi Pulang"
                  : markingPulang
                    ? "Memproses..."
                    : "Presensi Pulang"}
              </button>
            )}
          </div>

        </div>

        {/* Rekap Presensi */}
        <div className="clay-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Rekap Presensi</h2>
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap gap-4 items-start mb-4">
            <div className="space-y-2" style={{ minWidth: 200 }}>
              <label className="text-sm font-bold text-foreground">Tanggal Mulai</label>
              <input
                type="date"
                value={rekapStartDate}
                onChange={(e) => setRekapStartDate(e.target.value)}
                className="clay-input h-11 px-4 rounded-xl w-full"
              />
            </div>
            <div className="space-y-2" style={{ minWidth: 200 }}>
              <label className="text-sm font-bold text-foreground">Tanggal Akhir</label>
              <input
                type="date"
                value={rekapEndDate}
                onChange={(e) => setRekapEndDate(e.target.value)}
                className="clay-input h-11 px-4 rounded-xl w-full"
              />
            </div>
            <button
              onClick={fetchRekap}
              disabled={rekapLoading}
              className="clay-button px-6 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 self-end"
              style={{ height: 44 }}
            >
              {rekapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
              Cari
            </button>
          </div>

          {/* Summary Cards */}
          {rekapData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Hadir", key: "hadir", color: "bg-success/10 text-success border-success/20" },
                { label: "Terlambat", key: "terlambat", color: "bg-warning/10 text-warning border-warning/20" },
                { label: "Sakit", key: "sakit", color: "bg-blue-100 text-blue-600 border-blue-200" },
                { label: "Izin", key: "izin", color: "bg-purple-100 text-purple-600 border-purple-200" },
                { label: "Alpa", key: "alpa", color: "bg-destructive/10 text-destructive border-destructive/20" },
              ].map((item) => {
                const count = rekapData.filter((r) => r.status === item.key).length;
                return (
                  <div key={item.key} className={`clay-card p-4 text-center border-2 ${item.color}`}>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs font-semibold mt-1">{item.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Jam Masuk</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Jam Pulang</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {rekapLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : rekapData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Klik "Cari" untuk menampilkan data presensi
                    </td>
                  </tr>
                ) : (
                  rekapData.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {record.login_time ? formatTime(record.login_time) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {record.logout_time ? formatTime(record.logout_time) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {todayStatusBadge(record.status)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
                        {record.location_lat && record.location_lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${record.location_lat},${record.location_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Lihat Lokasi
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!rekapLoading && rekapData.length > 0 && (
            <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground text-right mt-3">
              Total: {rekapData.length} hari
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">
                {confirmAction === "masuk" && "Presensi Masuk?"}
                {confirmAction === "pulang" && "Presensi Pulang?"}
                {confirmAction === "sakit" && "Presensi Sakit?"}
                {confirmAction === "izin" && "Presensi Izin?"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {confirmAction === "masuk" && "Pastikan Anda berada di area sekolah. Lokasi akan dicatat."}
                {confirmAction === "pulang" && "Konfirmasi presensi pulang hari ini?"}
                {confirmAction === "sakit" && "Anda tidak perlu berada di area sekolah. Lokasi tetap akan dicatat jika tersedia."}
                {confirmAction === "izin" && "Anda tidak perlu berada di area sekolah. Lokasi tetap akan dicatat jika tersedia."}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (confirmAction === "masuk") handleMarkMasuk();
                    else if (confirmAction === "pulang") handleMarkPulang();
                    else if (confirmAction === "sakit") handleMarkSakit();
                    else if (confirmAction === "izin") handleMarkIzin();
                    setConfirmAction(null);
                  }}
                  className="bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Ya, {confirmAction === "masuk" ? "Presensi Masuk" : confirmAction === "pulang" ? "Presensi Pulang" : confirmAction === "sakit" ? "Presensi Sakit" : "Presensi Izin"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SkeletonWrapper>
  );
}
