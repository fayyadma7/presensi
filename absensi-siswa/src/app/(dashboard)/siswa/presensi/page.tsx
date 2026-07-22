"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchHolidays, getHolidayName } from "@/lib/holidays";
import { isSchoolDay, formatDateLocal } from "@/lib/helpers";
import { getCurrentPosition, getGPSErrorMessage } from "@/lib/geofencing";
import { CheckCircle, Clock, Calendar, Loader2, MapPin, MapPinOff, CalendarOff, HeartPulse, FileText, AlertCircle, IdCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import BarcodeDisplay from "@/components/BarcodeDisplay";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/skeleton";

interface StudentInfo {
  name: string;
  nis: string;
  className: string;
}

interface Settings {
  morning_start: string;
  late_threshold: string;
  afternoon_start: string;
  afternoon_end: string;
  auto_late: string;
}

interface TodayRecord {
  masuk_status: string | null;
  late_status: string | null;
  masuk_time: string | null;
  pulang_status: string | null;
  pulang_time: string | null;
  created_at: string;
}

interface HistoryRecord {
  date: string;
  masuk_status: string | null;
  late_status: string | null;
  masuk_time: string | null;
  pulang_status: string | null;
  pulang_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

function PresensiSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-8 w-48" />
      </div>
      <SkeletonCard />
      <div className="clay-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Skeleton className="h-10 w-full rounded-2xl mb-6" />
        <SkeletonTable rows={1} cols={4} />
      </div>
      <SkeletonTable rows={3} cols={6} />
    </div>
  );
}

export default function SiswaPresensiPage() {
  const supabase = createClient();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "valid" | "invalid" | "unavailable" | "timeout" | "denied">("checking");
  const [cachedPosition, setCachedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [todayIsSchoolDay, setTodayIsSchoolDay] = useState<boolean>(true);
  const [holidayName, setHolidayName] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const [confirmAction, setConfirmAction] = useState<"pulang" | "sakit" | "izin" | null>(null);
  const [notes, setNotes] = useState("");
  const [markingPulang, setMarkingPulang] = useState(false);
  const [markingSakit, setMarkingSakit] = useState(false);
  const [markingIzin, setMarkingIzin] = useState(false);

  useEffect(() => {
    if (userId) {
      initPage();
      fetchGPS();
    }
  }, [userId]);

  const fetchGPS = useCallback(async () => {
    setGpsStatus("checking");
    const result = await getCurrentPosition();
    if (result.success) {
      setCachedPosition({ lat: result.lat, lng: result.lng });
      setGpsStatus("valid");
    } else {
      setGpsStatus(result.error);
    }
  }, []);

  async function initPage() {
    if (!userId) return;

    const todayDate = new Date();
    const today = formatDateLocal(todayDate);
    const currentYear = todayDate.getFullYear();

    const [studentResult, settingsResult, existingResult, fetchedHolidays] = await Promise.all([
      supabase.from("students").select("nis, name, classes(name)").eq("id", userId).maybeSingle(),
      supabase.from("settings").select("key, value"),
      supabase.from("attendance").select("masuk_status, late_status, masuk_time, pulang_status, pulang_time, created_at").eq("student_id", userId).eq("date", today).maybeSingle(),
      fetchHolidays(currentYear),
    ]);

    const { data: student } = studentResult;
    if (student) {
      setStudentInfo({
        name: student.name,
        nis: student.nis,
        className: Array.isArray(student.classes)
          ? student.classes[0]?.name || ""
          : (student.classes as { name: string })?.name || "",
      });
    }

    const { data: settingsData } = settingsResult;
    if (settingsData) {
      const map: Record<string, string> = {};
      settingsData.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));
      setSettings(map as unknown as Settings);
    }

    const { data: existing } = existingResult;
    setTodayRecord(existing || null);

    setHolidays(fetchedHolidays);

    const isTodaySchoolDay = isSchoolDay(today, fetchedHolidays);
    setTodayIsSchoolDay(isTodaySchoolDay);

    if (!isTodaySchoolDay) {
      const name = await getHolidayName(today);
      setHolidayName(name);
      setGpsStatus("unavailable");
    }

    setLoading(false);
  }

  function getTimeFromSettings(timeStr: string): string {
    return timeStr?.substring(0, 5) || "";
  }

  function getCurrentTimeWindow(): { type: "berangkat" | "pulang" | null; isLate: boolean; message: string; autoPulang?: boolean } {
    if (!settings) return { type: null, isLate: false, message: "" };

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const morningStart = getTimeFromSettings(settings.morning_start);
    const lateThreshold = getTimeFromSettings(settings.late_threshold);
    const afternoonStart = getTimeFromSettings(settings.afternoon_start);
    const afternoonEnd = getTimeFromSettings(settings.afternoon_end);

    if (currentTime >= morningStart && currentTime < afternoonStart) {
      const isLate = settings.auto_late === "true" && currentTime > lateThreshold;
      return {
        type: "berangkat",
        isLate,
        message: isLate ? "Anda terlambat! Segera presensi masuk." : "Waktu presensi MASUK",
      };
    }

    if (currentTime >= afternoonStart && currentTime <= afternoonEnd) {
      return {
        type: "pulang",
        isLate: false,
        message: "Waktu presensi PULANG",
      };
    }

    if (currentTime > afternoonEnd) {
      return {
        type: null,
        isLate: false,
        message: "Waktu presensi pulang sudah berakhir",
        autoPulang: true,
      };
    }

    return {
      type: null,
      isLate: false,
      message: "Di luar jam presensi (Sakit/Izin tetap bisa dicatat)",
    };
  }

  const hasMasuk = todayRecord?.masuk_status === "hadir" || todayRecord?.masuk_status === "terlambat";
  const hasPulang = todayRecord?.pulang_status != null;
  const hasAnyAttendance = todayRecord != null;
  const currentStatus = todayRecord?.masuk_status || "";
  const isSakitOrIzin = currentStatus === "sakit" || currentStatus === "izin";

  // History pagination state
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const timeWindow = getCurrentTimeWindow();
  const isMasukTime = timeWindow.type === "berangkat";
  const isPulangTime = timeWindow.type === "pulang";

  const nowHHMM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();
  const isBeforeHours = settings ? nowHHMM < settings.morning_start : false;
  const isAfterHours = settings ? nowHHMM > settings.afternoon_end : false;
  const timeDisabled = todayIsSchoolDay && (isBeforeHours || isAfterHours);
  const timeDisabledReason = isBeforeHours ? "Belum jam masuk" : isAfterHours ? "Jam pulang sudah berakhir" : "";

  // Fetch paginated history
  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from("attendance")
      .select("date, masuk_status, late_status, masuk_time, pulang_status, pulang_time, location_lat, location_lng", { count: "exact" })
      .eq("student_id", userId)
      .order("date", { ascending: false })
      .range(from, to);
    if (error) {
      console.error("Fetch history error:", error);
      return;
    }
    setHistoryRecords(data || []);
    setTotalHistory(count || 0);
  }, [supabase, userId, currentPage]);

  // Fetch history when page changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = useCallback(async (type: "pulang" | "sakit" | "izin", alasan?: string) => {
    if (!todayIsSchoolDay) {
      setResult({ success: false, message: "Hari ini hari libur. Presensi tidak tersedia." });
      return;
    }

    if (timeDisabled) {
      setResult({ success: false, message: timeDisabledReason || "Di luar jam presensi." });
      toast.warning(timeDisabledReason || "Di luar jam presensi.");
      return;
    }

    // Block if GPS not available
    const gpsError = gpsStatus === "unavailable" ? "GPS belum aktif. Aktifkan GPS di perangkat Anda."
      : gpsStatus === "timeout" ? "Sinyal GPS lemah. Coba di luar ruangan."
      : gpsStatus === "denied" ? "Izinkan akses lokasi di pengaturan browser."
      : null;
    if (gpsError) {
      setResult({ success: false, message: gpsError });
      toast.warning(gpsError);
      return;
    }

    // GPS valid check for pulang (must be in school area)
    if (type === "pulang" && gpsStatus !== "valid") {
      setResult({ success: false, message: "Anda berada di luar area sekolah. Maju ke area sekolah untuk presensi." });
      toast.error("Anda berada di luar area sekolah.");
      return;
    }

    setSubmitting(true);
    setResult(null);

    if (type === "pulang") setMarkingPulang(true);
    else if (type === "sakit") setMarkingSakit(true);
    else if (type === "izin") setMarkingIzin(true);

    try {
      if (!userId) {
        setResult({ success: false, message: "Session expired. Silakan login ulang." });
        toast.error("Session expired. Silakan login ulang.");
        return;
      }

      const today = formatDateLocal();
      let dbStatus: "hadir" | "terlambat" | "sakit" | "izin" = "hadir";

      if (type === "pulang") {
        if (!isPulangTime) {
          setResult({ success: false, message: "Bukan jam presensi pulang." });
          return;
        }
        dbStatus = "hadir";
      } else if (type === "sakit") {
        dbStatus = "sakit";
      } else if (type === "izin") {
        dbStatus = "izin";
      }

      // Check duplicate and fetch existing record id in one query
      const { data: existingRec } = await supabase
        .from("attendance")
        .select("id, masuk_status, pulang_status")
        .eq("student_id", userId)
        .eq("date", today)
        .maybeSingle();

      if (type === "pulang") {
        if (existingRec?.pulang_status) {
          setResult({ success: false, message: "Anda sudah melakukan presensi pulang hari ini." });
          toast.info("Anda sudah melakukan presensi pulang hari ini.");
          return;
        }
      } else {
        // sakit/izin
        if (existingRec?.masuk_status) {
          setResult({ success: false, message: "Anda sudah melakukan presensi hari ini." });
          toast.info("Anda sudah melakukan presensi hari ini.");
          return;
        }
      }

      const lat = cachedPosition?.lat ?? null;
      const lng = cachedPosition?.lng ?? null;

      let error;
      if (existingRec) {
        // Update existing row
        const result = await supabase
          .from("attendance")
          .update({
            ...(type === "pulang"
              ? { pulang_status: "pulang", pulang_time: new Date().toISOString() }
              : { masuk_status: dbStatus, masuk_time: new Date().toISOString() }
            ),
            ...(alasan ? { notes: alasan } : {}),
            location_lat: lat,
            location_lng: lng,
          })
          .eq("id", existingRec.id);
        error = result.error;
      } else {
        // Insert new row
        const result = await supabase
          .from("attendance")
          .insert({
            student_id: userId,
            date: today,
            ...(type === "pulang"
              ? { pulang_status: "pulang", pulang_time: new Date().toISOString() }
              : { masuk_status: dbStatus, masuk_time: new Date().toISOString() }
            ),
            ...(alasan ? { notes: alasan } : {}),
            location_lat: lat,
            location_lng: lng,
          });
        error = result.error;
      }

      if (error) {
        console.error("Insert/update attendance error:", error);
        setResult({ success: false, message: "Gagal mencatat presensi." });
        toast.error("Gagal mencatat presensi.");
        return;
      }

      // Refresh today's record
      const { data: updated } = await supabase
        .from("attendance")
        .select("masuk_status, masuk_time, pulang_status, pulang_time, created_at")
        .eq("student_id", userId)
        .eq("date", today)
        .maybeSingle();
      setTodayRecord(updated || null);

      // Refresh history paginasi
      fetchHistory();

      setResult({ success: true, message: `Presensi ${type} berhasil dicatat!` });
      toast.success(`Presensi ${type} berhasil dicatat!`);
    } finally {
      setSubmitting(false);
      if (type === "pulang") setMarkingPulang(false);
      else if (type === "sakit") setMarkingSakit(false);
      else if (type === "izin") setMarkingIzin(false);
    }
  }, [supabase, cachedPosition, todayRecord, todayIsSchoolDay, gpsStatus, userId, timeWindow, isMasukTime, isPulangTime, timeDisabled, timeDisabledReason, fetchHistory]);

  return (
    <SkeletonWrapper loading={loading} skeleton={<PresensiSkeleton />}>
      <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Calendar className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Presensi Siswa</h1>
      </div>

      {!todayIsSchoolDay && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <CalendarOff className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Hari libur</p>
            <p className="text-sm text-amber-700">{holidayName || "Hari ini hari libur (Sabtu/Minggu)"} - Presensi tidak tersedia</p>
          </div>
        </div>
      )}

      {/* Barcode Display */}
      {studentInfo && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center mb-4">
            <p className="text-sm font-bold text-muted-foreground">Barcode Presensi Anda</p>
            <p className="text-xs text-muted-foreground">Tunjukkan ke guru untuk scan kehadiran</p>
          </div>
          <BarcodeDisplay 
            nis={studentInfo.nis} 
            name={studentInfo.name} 
            className={studentInfo.className}
            size="large" 
            showInfo 
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-500">Nama</p>
            <p className="text-xl font-bold text-gray-900">{studentInfo?.name || "-"}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-500">NIS</p>
            <p className="text-xl font-bold text-gray-900 font-mono">{studentInfo?.nis || "-"}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-500">Kelas</p>
            <p className="text-xl font-bold text-gray-900">{studentInfo?.className || "-"}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            {gpsStatus === "checking" && (
              <>
                <MapPin className="h-4 w-4 animate-pulse text-gray-400" />
                <span className="text-gray-500">Memuat lokasi...</span>
              </>
            )}
            {gpsStatus === "valid" && (
              <>
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Lokasi terdeteksi</span>
              </>
            )}
            {gpsStatus === "timeout" && (
              <>
                <MapPinOff className="h-4 w-4 text-amber-600" />
                <span className="text-amber-600 font-medium">Sinyal GPS lemah</span>
              </>
            )}
            {gpsStatus === "denied" && (
              <>
                <MapPinOff className="h-4 w-4 text-red-500" />
                <span className="text-red-500 font-medium">Izin lokasi ditolak</span>
              </>
            )}
            {gpsStatus === "unavailable" && (
              <>
                <MapPinOff className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">GPS tidak tersedia</span>
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
          {(gpsStatus === "timeout" || gpsStatus === "denied" || gpsStatus === "unavailable") && (
            <p className="text-xs text-gray-500 mt-1 ml-6">{getGPSErrorMessage(gpsStatus)}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Presensi Hari Ini</h2>
          </div>

          {todayRecord ? (
            <div className="mb-4 p-4 bg-gray-50 rounded-2xl">
              <div className="flex flex-wrap gap-4 text-sm">
                {todayRecord.masuk_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Masuk:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        todayRecord.masuk_status === "hadir" && todayRecord.late_status === "terlambat" ? "bg-amber-100 text-amber-600" :
                        todayRecord.masuk_status === "hadir" ? "bg-green-100 text-green-600" :
                        todayRecord.masuk_status === "sakit" ? "bg-blue-100 text-blue-600" :
                        todayRecord.masuk_status === "izin" ? "bg-purple-100 text-purple-600" :
                        todayRecord.masuk_status === "dispen" ? "bg-sky-100 text-sky-600" :
                        "bg-red-100 text-red-600"
                      }`}>
                      {todayRecord.masuk_status === "hadir" && todayRecord.late_status === "terlambat" ? "Terlambat" :
                       todayRecord.masuk_status === "hadir" ? "Hadir" :
                       todayRecord.masuk_status === "sakit" ? "Sakit" :
                       todayRecord.masuk_status === "izin" ? "Izin" :
                       todayRecord.masuk_status === "dispen" ? "Dispen" : "Alpa"}
                    </span>
                    {todayRecord.masuk_time && (
                      <span className="text-gray-500">
                        {new Date(todayRecord.masuk_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}
                {todayRecord.pulang_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Pulang:</span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                      Pulang
                    </span>
                    {todayRecord.pulang_time && (
                      <span className="text-gray-500">
                        {new Date(todayRecord.pulang_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-gray-50 rounded-2xl text-center">
              <p className="text-gray-500 text-sm">Belum melakukan presensi hari ini</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Presensi Pulang */}
            {isPulangTime && hasMasuk && !hasPulang && (
              <button
                onClick={() => setConfirmAction("pulang")}
                disabled={submitting || markingPulang || timeDisabled}
                title={timeDisabled ? timeDisabledReason : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  submitting || markingPulang
                    ? "bg-amber-300 text-white cursor-wait"
                    : timeDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : "bg-amber-100 text-amber-600 cursor-pointer"
                }`}
              >
                {markingPulang ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
                {markingPulang ? "Memproses..." : "Presensi Pulang"}
              </button>
            )}

            {/* Sakit */}
            {!hasAnyAttendance && (
              <button
                onClick={() => { setConfirmAction("sakit"); setNotes(""); }}
                disabled={submitting || markingSakit || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" ? "Aktifkan GPS" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  submitting || markingSakit
                    ? "bg-blue-300 text-white cursor-wait"
                    : timeDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied"
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                        : "bg-blue-100 text-blue-600 cursor-pointer"
                }`}
              >
                {markingSakit ? (
                  <div className="h-5 w-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <HeartPulse className="h-5 w-5" />
                )}
                {markingSakit ? "Memproses..." : "Sakit"}
              </button>
            )}

            {/* Izin */}
            {!hasAnyAttendance && (
              <button
                onClick={() => { setConfirmAction("izin"); setNotes(""); }}
                disabled={submitting || markingIzin || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" || timeDisabled}
                title={timeDisabled ? timeDisabledReason : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied" ? "Aktifkan GPS" : ""}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                  submitting || markingIzin
                    ? "bg-purple-300 text-white cursor-wait"
                    : timeDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "denied"
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                        : "bg-purple-100 text-purple-600 cursor-pointer"
                }`}
              >
                {markingIzin ? (
                  <div className="h-5 w-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                {markingIzin ? "Memproses..." : "Izin"}
              </button>
            )}

            {/* After afternoon_end, has masuk but no pulang */}
            {hasMasuk && !hasPulang && timeWindow.autoPulang && (
              <button disabled className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-500 cursor-not-allowed">
                <Clock className="h-5 w-5" />
                Waktu Presensi Pulang Telah Berakhir
              </button>
            )}

            {/* Status sudah presensi pulang */}
            {hasPulang && (
              <button disabled className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-green-100 text-green-600 cursor-not-allowed">
                <CheckCircle className="h-5 w-5" />
                Sudah Presensi Pulang
              </button>
            )}
            {isSakitOrIzin && (
              <button disabled className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-blue-100 text-blue-600 cursor-not-allowed">
                <CheckCircle className="h-5 w-5" />
                Sudah Presensi {currentStatus === "sakit" ? "Sakit" : "Izin"}
              </button>
            )}
          </div>

          {!isMasukTime && !isPulangTime && !hasAnyAttendance && (
            <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {timeDisabled ? timeDisabledReason : (timeWindow.message || "Di luar jam presensi masuk/pulang. Sakit/Izin tetap bisa dicatat.")}
            </p>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Riwayat Kehadiran</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu Masuk</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status Masuk</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu Pulang</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status Pulang</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {historyRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Belum ada riwayat kehadiran
                  </td>
                </tr>
              )}
              {historyRecords.map((att) => (
                <tr key={att.date} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {att.date && new Date(att.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {att.masuk_time ? new Date(att.masuk_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {att.masuk_status ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          att.masuk_status === "hadir" && att.late_status === "terlambat" ? "bg-amber-100 text-amber-600" :
                          att.masuk_status === "hadir" ? "bg-green-100 text-green-600" :
                          att.masuk_status === "sakit" ? "bg-blue-100 text-blue-600" :
                          att.masuk_status === "izin" ? "bg-purple-100 text-purple-600" :
                          "bg-red-100 text-red-600"}`}>
                        {att.masuk_status === "hadir" && att.late_status === "terlambat" ? "Terlambat" :
                         att.masuk_status === "hadir" ? "Hadir" :
                         att.masuk_status === "sakit" ? "Sakit" :
                         att.masuk_status === "izin" ? "Izin" : "Alpa"}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {att.pulang_time ? new Date(att.pulang_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {att.pulang_status ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                        Pulang
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {att.location_lat && att.location_lng ? (
                      <a
                        href={`https://www.google.com/maps?q=${att.location_lat},${att.location_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Lihat Lokasi
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalHistory > pageSize && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalHistory)} dari {totalHistory} data
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalHistory / pageSize)) }, (_, i) => {
                    let pageNum: number;
                    const totalPages = Math.ceil(totalHistory / pageSize);
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalHistory / pageSize), p + 1))}
                  disabled={currentPage === Math.ceil(totalHistory / pageSize)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {confirmAction === "pulang" ? "Presensi Pulang?" : 
               confirmAction === "sakit" ? "Presensi Sakit?" : 
               confirmAction === "izin" ? "Presensi Izin?" : ""}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmAction === "pulang" && "Konfirmasi presensi pulang hari ini?"}
              {(confirmAction === "sakit" || confirmAction === "izin") && "Pastikan GPS aktif. Lokasi Anda akan dicatat untuk verifikasi guru."}
            </p>
            {(confirmAction === "sakit" || confirmAction === "izin") && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan alasan (wajib diisi)..."
                className="clay-input w-full rounded-xl p-3 text-sm min-h-[80px] mb-4"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmAction === "pulang") handleSubmit("pulang");
                  else if (confirmAction === "sakit") handleSubmit("sakit", notes.trim());
                  else if (confirmAction === "izin") handleSubmit("izin", notes.trim());
                  setConfirmAction(null);
                }}
                disabled={confirmAction !== "pulang" && notes.trim() === ""}
                className={`font-bold text-sm px-4 py-2 rounded-xl ${
                  confirmAction !== "pulang" && notes.trim() === ""
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white cursor-pointer"
                }`}
              >
                Ya, {confirmAction === "pulang" ? "Presensi Pulang" : confirmAction === "sakit" ? "Presensi Sakit" : "Presensi Izin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SkeletonWrapper>
  );
}
