"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ListChecks,
  CalendarOff,
  BookOpen,
  Users,
  Clock,
  MapPin,
  MapPinOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  LogOut,
  User,
  LogIn,
  HeartPulse,
  FileText,
  RefreshCw,
} from "lucide-react";
import { getCurrentPosition, isWithinSchool } from "@/lib/geofencing";
import { getDeviceFingerprint } from "@/lib/device";
import { fetchHolidays, getHolidayName } from "@/lib/holidays";
import { isSchoolDay, formatDateLocal, formatTime, formatDate } from "@/lib/helpers";
import dynamic from "next/dynamic";
import { SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import SkeletonWrapper from "@/components/SkeletonWrapper";

const Select = dynamic(() => import("@/components/ui/select").then((m) => m.Select), { ssr: false });
const SelectContent = dynamic(() => import("@/components/ui/select").then((m) => m.SelectContent), { ssr: false });
const SelectItem = dynamic(() => import("@/components/ui/select").then((m) => m.SelectItem), { ssr: false });
const SelectTrigger = dynamic(() => import("@/components/ui/select").then((m) => m.SelectTrigger), { ssr: false });
const SelectValue = dynamic(() => import("@/components/ui/select").then((m) => m.SelectValue), { ssr: false });

const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTitle), { ssr: false });
const DialogTrigger = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTrigger), { ssr: false });

interface Student {
  id: string;
  nis: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

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

export interface SubjectSchedule {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  day_of_week: number;
  teacher_subject_id: string;
  subject_id: string;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
  teacher_status: string | null;
}

interface TeacherAttendanceStatus {
  schedule_id: string;
  status: string;
}

/* ============================================================
   StudentAttendanceRow – Claymorphism row
   ============================================================ */
const StudentAttendanceRow = memo(function StudentAttendanceRow({
  student,
  berangkatStatus,
  pulangStatus,
  location,
  type,
  onMark,
  holidayDisabled,
  timeDisabled,
  timeDisabledReason,
}: {
  student: Student;
  berangkatStatus: string | undefined;
  pulangStatus: string | undefined;
  location: { lat: number; lng: number } | null | undefined;
  type: "berangkat" | "pulang";
  onMark: (studentId: string, status: string) => void;
  holidayDisabled: boolean;
  timeDisabled?: boolean;
  timeDisabledReason?: string;
}) {
  const variants: Record<string, string> = {
    hadir: "bg-success/10 text-success border-2 border-success/20",
    terlambat: "bg-warning/10 text-warning border-2 border-warning/20",
    sakit: "bg-secondary/10 text-secondary border-2 border-secondary/20",
    izin: "bg-secondary/10 text-secondary border-2 border-secondary/20",
    dispen: "bg-sky-100 text-sky-600 border-2 border-sky-200",
    alpa: "bg-destructive/10 text-destructive border-2 border-destructive/20",
  };
  const labels: Record<string, string> = {
    hadir: "Hadir",
    terlambat: "Terlambat",
    sakit: "Sakit",
    izin: "Izin",
    dispen: "Dispen",
    alpa: "Alpa",
  };

  const buttonsDisabled = holidayDisabled;
  const htDisabled = holidayDisabled || !!timeDisabled;

  if (type === "berangkat") {
    const displayStatus = berangkatStatus;
    const showBadge = displayStatus ? (
      <span className={`clay-badge px-2 py-0.5 text-xs font-bold whitespace-nowrap ${variants[displayStatus] || ""}`}>
        {labels[displayStatus] || displayStatus}
      </span>
    ) : (
      <span className="clay-badge px-2 py-0.5 text-xs font-bold bg-muted text-muted-foreground whitespace-nowrap">Belum Presensi</span>
    );

    return (
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
        <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{student.nis}</td>
        <td className="px-4 py-3 font-medium">{student.name}</td>
        <td className="px-4 py-3">{showBadge}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {location ? (
            <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">
              Lihat Lokasi
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex gap-1 justify-end">
            {(["hadir", "sakit", "izin", "dispen", "alpa"] as const).map((st) => {
              const isHT = st === "hadir" || st === "alpa";
              const isDisabled = isHT ? htDisabled : (st === "dispen" ? buttonsDisabled : buttonsDisabled);
              const title = holidayDisabled ? "Hari ini libur" : (isHT && timeDisabled ? timeDisabledReason || "Di luar jam presensi" : "");
              return (
                <button
                  key={st}
                  onClick={() => onMark(student.id, st)}
                  disabled={isDisabled}
                  title={title}
                  className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition ${
                    isDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : berangkatStatus === st
                        ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"
                  }`}
                >
                  {st === "hadir" ? "H" : st === "sakit" ? "S" : st === "izin" ? "I" : st === "dispen" ? "D" : "A"}
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  if (!berangkatStatus) {
    return (
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
        <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{student.nis}</td>
        <td className="px-4 py-3 font-medium">{student.name}</td>
        <td className="px-4 py-3">
          <span className="clay-badge px-2 py-0.5 text-xs font-bold bg-muted text-muted-foreground whitespace-nowrap">
Belum Presensi Masuk
          </span>
        </td>
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">-</td>
        <td className="px-4 py-3 text-right">
          <div className="flex gap-1 justify-end">
            {(["sakit", "izin", "dispen", "alpa"] as const).map((st) => {
              const isAlpa = st === "alpa";
              const isDisabled = isAlpa ? htDisabled : buttonsDisabled;
              const title = holidayDisabled ? "Hari ini libur" : (isAlpa && timeDisabled ? timeDisabledReason || "Di luar jam presensi" : "");
              return (
                <button
                  key={st}
                  onClick={() => onMark(student.id, st)}
                  disabled={isDisabled}
                  title={title}
                  className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition ${
                    isDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"
                  }`}
                >
                  {st === "sakit" ? "S" : st === "izin" ? "I" : st === "dispen" ? "D" : "A"}
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  if (berangkatStatus === "sakit" || berangkatStatus === "izin" || berangkatStatus === "dispen") {
    return (
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
        <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{student.nis}</td>
        <td className="px-4 py-3 font-medium">{student.name}</td>
        <td className="px-4 py-3">
          <span className={`clay-badge px-2 py-0.5 text-xs font-bold whitespace-nowrap ${variants[berangkatStatus]}`}>
            {labels[berangkatStatus]}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs text-muted-foreground">-</span>
        </td>
      </tr>
    );
  }

  if (berangkatStatus === "alpa") {
    return (
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
        <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{student.nis}</td>
        <td className="px-4 py-3 font-medium">{student.name}</td>
        <td className="px-4 py-3">
          <span className={`clay-badge px-2 py-0.5 text-xs font-bold whitespace-nowrap ${variants.alpa}`}>
            Alpa
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex gap-1 justify-end">
            {(["sakit", "izin", "dispen", "alpa"] as const).map((st) => {
              const isAlpa = st === "alpa";
              const isDisabled = isAlpa ? htDisabled : buttonsDisabled;
              const title = holidayDisabled ? "Hari ini libur" : (isAlpa && timeDisabled ? timeDisabledReason || "Di luar jam presensi" : "");
              return (
                <button
                  key={st}
                  onClick={() => onMark(student.id, st)}
                  disabled={isDisabled}
                  title={title}
                  className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition ${
                    isDisabled
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : pulangStatus === st
                        ? "bg-primary text-primary-foreground shadow-[0_2px_8px rgba(79,70,229,0.3)]"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"
                  }`}
                >
                  {st === "sakit" ? "S" : st === "izin" ? "I" : st === "dispen" ? "D" : "A"}
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  const displayStatus = pulangStatus ? "Sudah Pulang" : "Belum Pulang";
  const badgeClass = pulangStatus
    ? "bg-success/10 text-success border-2 border-success/20"
    : "bg-muted text-muted-foreground";

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
      <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{student.nis}</td>
      <td className="px-4 py-3 font-medium">{student.name}</td>
        <td className="px-4 py-3">
          <span className={`clay-badge px-2 py-0.5 text-xs font-bold whitespace-nowrap ${badgeClass}`}>
            {displayStatus}
          </span>
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {location ? (
            <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">
              Lihat Lokasi
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => onMark(student.id, "hadir")}
            disabled={!!pulangStatus || htDisabled}
            title={holidayDisabled ? "Hari ini libur" : (timeDisabled ? timeDisabledReason || "Di luar jam presensi" : "")}
            className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition ${
              pulangStatus || htDisabled
                ? "bg-success/10 text-success cursor-not-allowed opacity-50"
                : "bg-primary text-primary-foreground shadow-[0_2px_8px rgba(79,70,229,0.3)] cursor-pointer"
            }`}
          >
            P
          </button>
        </div>
      </td>
    </tr>
  );
});

function DashboardPresensiSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-6 w-56 bg-muted animate-pulse rounded" />
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-10 w-full bg-muted animate-pulse rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
      <div>
        <SkeletonTable rows={8} cols={4} />
      </div>
    </>
  );
}

export default function GuruPresensiPage() {
  const SIMULASI_MODE = false;

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "harian";
  const { user, userId, userRole, isWaliKelas } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [berangkatMap, setBerangkatMap] = useState<Record<string, string>>({});
  const [pulangMap, setPulangMap] = useState<Record<string, string>>({});
  const [locationMap, setLocationMap] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [presenceType, setPresenceType] = useState<"berangkat" | "pulang">("berangkat");
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
  const [teacherName, setTeacherName] = useState("");

  const nowHHMM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();
  const isBeforeHours = settings ? nowHHMM < settings.morning_start : false;
  const isAfterHours = settings ? nowHHMM > settings.afternoon_end : false;
  const timeDisabled = todayIsSchoolDay && (isBeforeHours || isAfterHours);
  const timeDisabledReason = isBeforeHours ? "Belum jam masuk" : isAfterHours ? "Jam pulang sudah berakhir" : "";

  const [schedules, setSchedules] = useState<SubjectSchedule[]>([]);
  const [subjectAttendanceModal, setSubjectAttendanceModal] = useState<{
    open: boolean;
    schedule: SubjectSchedule | null;
  }>({ open: false, schedule: null });
  const [subjectStudents, setSubjectStudents] = useState<Student[]>([]);
  const [subjectAttendanceMap, setSubjectAttendanceMap] = useState<Record<string, string>>({});
  const [teacherStatusOpen, setTeacherStatusOpen] = useState<SubjectSchedule | null>(null);
  const [currentTeacherName, setCurrentTeacherName] = useState("");
  const [subjectPriorMap, setSubjectPriorMap] = useState<Record<string, boolean>>({});

  const [rekapStartDate, setRekapStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [rekapEndDate, setRekapEndDate] = useState(formatDateLocal());
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);

  useEffect(() => {
    if (userRole === "guru" && !isWaliKelas && tab === "siswa") {
      router.replace("/guru/presensi?tab=harian");
    }
  }, [userRole, isWaliKelas, tab, router]);

  useEffect(() => {
    async function init() {
      const today = formatDateLocal();
      const year = new Date().getFullYear();

      const [settingsResult, userResult, classResult, fetchedHolidays, attResult] = await Promise.all([
        supabase.from("settings").select("key, value"),
        supabase.from("users").select("name").eq("id", userId).maybeSingle(),
        supabase.from("classes").select("id, name").eq("wali_kelas_id", userId).order("name"),
        fetchHolidays(year),
        supabase.from("teacher_attendance").select("id, teacher_id, date, login_time, logout_time, status, location_lat, location_lng").eq("teacher_id", userId).eq("date", today).maybeSingle(),
      ]);

      const { data: settingsData } = settingsResult;
      if (settingsData) {
        const map: Record<string, string> = {};
        settingsData.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));
        setSettings(map as unknown as Settings);
      }

      const { data: userData } = userResult;
      if (userData) setCurrentTeacherName(userData.name);

      const { data: classData } = classResult;
      setClasses(classData || []);
      if (classData && classData.length === 1) {
        setSelectedClass(classData[0].id);
      }

      setHolidays(fetchedHolidays);
      const schoolDay = isSchoolDay(today, fetchedHolidays);
      setTodayIsSchoolDay(SIMULASI_MODE ? true : schoolDay);
      if (!schoolDay) {
        const name = await getHolidayName(today);
        setHolidayName(name);
      }

      const { data: teacherAtt } = attResult;
      setTodayRecord(teacherAtt);

      if (tab === "mapel") {
        await fetchTodaySchedules(fetchedHolidays);
      }

      setPageLoading(false);
    }
    if (userId) init();
  }, [supabase, userId, tab]);

  useEffect(() => {
    if (tab === "siswa" && selectedClass && settings) {
      fetchStudents();
    }
    if (tab === "mapel") {
      fetchTodaySchedules(holidays.length > 0 ? holidays : undefined);
    }
  }, [selectedClass, settings, tab]);

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

  async function fetchStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, nis, name")
      .eq("class_id", selectedClass)
      .eq("status", "active")
      .order("nis");

    setStudents(data || []);

    const today = formatDateLocal();
    const studentIds = data?.map((s: { id: string }) => s.id) || [];
    if (studentIds.length === 0) return;

    const { data: attData } = await supabase
      .from("attendance")
      .select("student_id, masuk_status, pulang_status, late_status, location_lat, location_lng")
      .eq("date", today)
      .in("student_id", studentIds);

    const bMap: Record<string, string> = {};
    const pMap: Record<string, string> = {};
    const lMap: Record<string, { lat: number; lng: number } | null> = {};
    attData?.forEach((a: { student_id: string; masuk_status: string | null; pulang_status: string | null; late_status: string | null; location_lat: number | null; location_lng: number | null }) => {
      if (a.masuk_status) {
        bMap[a.student_id] = a.late_status === 'terlambat' ? 'terlambat' : a.masuk_status;
        lMap[a.student_id] = a.location_lat && a.location_lng ? { lat: a.location_lat, lng: a.location_lng } : null;
      }
      if (a.pulang_status) pMap[a.student_id] = a.pulang_status;
    });
    setBerangkatMap(bMap);
    setPulangMap(pMap);
    setLocationMap(lMap);
  }

  async function fetchTodaySchedules(holidayDates?: string[]) {
    if (!userId) return;
    const today = new Date();
    const dayOfWeek = SIMULASI_MODE ? 2 : today.getDay();
    const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    const dow = dayMap[dayOfWeek] || 0;

    if (!dow) {
      setSchedules([]);
      return;
    }

    const dateStr = formatDateLocal();
    const { data } = await supabase
      .from("schedules")
      .select(`
        id, start_time, end_time, room, day_of_week, teacher_subject_id,
        teacher_subjects!inner(
          teacher_id, subject_id, class_id,
          subjects!inner(name, code),
          classes!inner(name)
        )
      `)
      .eq("teacher_subjects.teacher_id", userId)
      .eq("day_of_week", dow)
      .order("start_time");

    if (!data) { setSchedules([]); return; }

    const mapped: SubjectSchedule[] = data.map((s: any) => ({
      id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room,
      day_of_week: s.day_of_week,
      teacher_subject_id: s.teacher_subject_id,
      subject_id: s.teacher_subjects.subject_id,
      class_id: s.teacher_subjects.class_id,
      subject_name: s.teacher_subjects.subjects.name,
      subject_code: s.teacher_subjects.subjects.code,
      class_name: s.teacher_subjects.classes.name,
      teacher_status: null,
    }));

    const scheduleIds = mapped.map((m) => m.id);
    if (scheduleIds.length > 0) {
      const { data: tsaData } = await supabase
        .from("teacher_subject_attendances")
        .select("schedule_id, status")
        .eq("date", dateStr)
        .eq("teacher_id", userId)
        .in("schedule_id", scheduleIds);

      const statusMap: Record<string, string> = {};
      tsaData?.forEach((tsa: TeacherAttendanceStatus) => {
        statusMap[tsa.schedule_id] = tsa.status;
      });
      mapped.forEach((m) => {
        m.teacher_status = statusMap[m.id] || null;
      });
    }

    setSchedules(mapped);
  }

  function getAutoStatus(): string {
    if (!settings || settings.auto_late !== "true") return "hadir";
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (presenceType === "berangkat") {
      if (currentTime > settings.late_threshold) return "terlambat";
    }
    return "hadir";
  }

  const markAttendance = useCallback(
    async (studentId: string, status: string) => {
      if (!todayIsSchoolDay) {
        toast.info("Hari ini hari libur. Presensi tidak tersedia.");
        return;
      }

      const today = formatDateLocal();
      const fingerprint = await getDeviceFingerprint();
      const locationLat = cachedPosition?.lat ?? null;
      const locationLng = cachedPosition?.lng ?? null;
      const nowISO = new Date().toISOString();

      if (presenceType === "pulang" && !berangkatMap[studentId]) {
        return;
      }

      if (presenceType === "berangkat") {
        const { error } = await supabase.from("attendance").upsert(
          { student_id: studentId, date: today, masuk_status: status === 'hadir' ? 'hadir' : status, late_status: status === 'hadir' && isLate() ? 'terlambat' : null, masuk_time: nowISO, device_fingerprint: fingerprint, location_lat: locationLat, location_lng: locationLng },
          { onConflict: "student_id,date" }
        );
        if (error) {
          toast.error("Gagal menyimpan kehadiran. Coba lagi.");
        } else {
          toast.success("Kehadiran berhasil ditandai.");
        }
      } else if (presenceType === "pulang") {
        const { error } = await supabase.from("attendance").upsert(
          { student_id: studentId, date: today, pulang_status: "pulang", pulang_time: nowISO, device_fingerprint: fingerprint, location_lat: locationLat, location_lng: locationLng },
          { onConflict: "student_id,date" }
        );
        if (error) {
          toast.error("Gagal menyimpan kehadiran. Coba lagi.");
        } else {
          toast.success("Kehadiran berhasil ditandai.");
        }
      }
      fetchStudents();
    },
    [supabase, presenceType, cachedPosition, berangkatMap, todayIsSchoolDay]
  );

  async function markTeacherStatus(schedule: SubjectSchedule, status: string) {
    const today = formatDateLocal();
    const { error } = await supabase.from("teacher_subject_attendances").upsert(
      {
        schedule_id: schedule.id,
        teacher_id: userId,
        date: today,
        status,
      },
      { onConflict: "schedule_id,teacher_id,date", ignoreDuplicates: false }
    );
    if (error) {
      toast.error("Gagal menyimpan status guru");
      return;
    }
    toast.success("Status guru berhasil disimpan");
    setTeacherStatusOpen(null);
    fetchTodaySchedules();
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

  async function openSubjectAttendance(schedule: SubjectSchedule) {
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
        .select("student_id, status")
        .eq("date", today)
        .in("student_id", studentIds);

      saData?.forEach((a: { student_id: string; status: string }) => {
        attMap[a.student_id] = a.status;
      });

      const { data: priorAtt } = await supabase
        .from("attendance")
        .select("student_id, masuk_status, late_status")
        .eq("date", today)
        .in("student_id", studentIds)
        .not("masuk_status", "is", null);

      const priorMap: Record<string, boolean> = {};
      priorAtt?.forEach((a: { student_id: string; masuk_status: string; late_status: string | null }) => {
        priorMap[a.student_id] = true;
        // Auto-fill from daily attendance if not already in subject_attendances
        if (!attMap[a.student_id]) {
          attMap[a.student_id] = a.late_status === 'terlambat' ? 'terlambat' : a.masuk_status;
        }
      });
      setSubjectPriorMap(priorMap);
    }

    setSubjectAttendanceMap(attMap);
    setSubjectAttendanceModal({ open: true, schedule });
  }

  async function markSubjectAttendance(studentId: string, status: string) {
    const schedule = subjectAttendanceModal.schedule;
    if (!schedule) return;
    const today = formatDateLocal();
    const nowISO = new Date().toISOString();

    // 1. Upsert subject_attendances (atomic via RPC to prevent race condition)
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

    // 2. Upsert attendance
    await supabase.from("attendance").upsert(
      { student_id: studentId, date: today, masuk_status: status === 'hadir' ? 'hadir' : status, late_status: status === 'hadir' && isLate() ? 'terlambat' : null, masuk_time: nowISO },
      { onConflict: "student_id,date" }
    );

    toast.success("Presensi siswa berhasil disimpan");
    setSubjectAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function markAllHadir() {
    const schedule = subjectAttendanceModal.schedule;
    if (!schedule) return;
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
          await supabase.from("attendance").upsert(
            { student_id: student.id, date: today, masuk_status: "hadir", late_status: isLate() ? 'terlambat' : null, masuk_time: nowISO },
            { onConflict: "student_id,date" }
          );
          return true;
        }
        return false;
      })
    );

    const count = results.filter(Boolean).length;
    toast.success(`${count} siswa ditandai Hadir`);
    const newMap: Record<string, string> = {};
    subjectStudents.forEach((s) => { newMap[s.id] = "hadir"; });
    setSubjectAttendanceMap(newMap);
  }

  function switchTab(t: string) {
    router.push(`/guru/presensi?tab=${t}`);
  }

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || "";

  return (
    <SkeletonWrapper loading={pageLoading} skeleton={<DashboardPresensiSkeleton />}>
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

        {SIMULASI_MODE && (
          <div className="clay-card p-4 border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-primary">🔬 Mode Simulasi</p>
                <p className="text-xs text-muted-foreground">
                  Hari ini Sabtu — sistem dipaksa berjalan sebagai hari Selasa. Data simulasi akan dihapus.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div className="clay-card p-1.5 flex gap-1 max-w-sm">
          <button
            onClick={() => switchTab("harian")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center clay-transition cursor-pointer ${
              tab === "harian"
                ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Harian
          </button>
          {isWaliKelas && (
            <button
              onClick={() => switchTab("siswa")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center clay-transition cursor-pointer ${
                tab === "siswa"
                  ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Siswa
            </button>
          )}
          <button
            onClick={() => switchTab("mapel")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center clay-transition cursor-pointer ${
              tab === "mapel"
                ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Mapel
          </button>
        </div>

        {/* TAB: HARIAN (teacher self-attendance) */}
        {tab === "harian" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Presensi Harian Guru</h1>
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
                <h2 className="font-heading font-bold text-foreground">Rekap Presensi Guru</h2>
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
          </div>
        )}

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

        {/* TAB: SISWA (daily attendance) */}
        {tab === "siswa" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <ListChecks className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    Presensi Kelas{selectedClassName ? ` ${selectedClassName}` : ""}
                  </h1>
                  <p className="text-sm text-muted-foreground">Tandai kehadiran siswa</p>
                </div>
              </div>
            </div>

            {/* Class & Type Selectors */}
            <div className="flex flex-col sm:flex-row gap-4">
              {classes.length === 1 ? (
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-bold text-foreground">Kelas</label>
                  <div className="clay-input h-11 px-4 rounded-xl flex items-center">
                    <span className="font-medium">{classes[0].name}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-bold text-foreground">Pilih Kelas</label>
                  <Select value={selectedClass} onValueChange={(v) => setSelectedClass(String(v || ""))}>
                    <SelectTrigger className="cursor-pointer clay-input h-11 px-4 rounded-xl border-0">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length === 0 && (
                        <SelectItem value="none" disabled>Tidak ada kelas ditugaskan</SelectItem>
                      )}
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Tipe Presensi</label>
                <Select
                  value={presenceType}
                  onValueChange={(v) => {
                    setPresenceType((String(v) as "berangkat" | "pulang") || "berangkat");
                  }}
                >
                  <SelectTrigger className="w-40 cursor-pointer clay-input h-11 px-4 rounded-xl border-0">
                    <span>{presenceType === "berangkat" ? "Berangkat" : "Pulang"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="berangkat" className="cursor-pointer">Berangkat</SelectItem>
                    <SelectItem value="pulang" className="cursor-pointer">Pulang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rekap Presensi Button */}
            <div className="flex justify-end">
              <a
                href="/guru/rekap"
                className="clay-button-accent px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">Rekap Presensi</span>
              </a>
            </div>

            {/* Student List */}
            {selectedClass && (
              <div className="clay-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <h2 className="font-heading font-bold text-foreground">Daftar Kehadiran</h2>
                  </div>
                  {presenceType === "berangkat" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto status: <span className="font-medium">{getAutoStatus()}</span>
                      {settings?.auto_late === "true" && (
                        <span> (terlambat jika lewat {settings.late_threshold})</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">NIS</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Lokasi</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <StudentAttendanceRow
                          key={student.id}
                          student={student}
                          berangkatStatus={berangkatMap[student.id]}
                          pulangStatus={pulangMap[student.id]}
                          location={locationMap[student.id]}
                          type={presenceType}
                          onMark={markAttendance}
                          holidayDisabled={!todayIsSchoolDay}
                          timeDisabled={timeDisabled}
                          timeDisabledReason={timeDisabledReason}
                        />
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Tidak ada siswa di kelas ini
                          </td>
                        </tr>
                      )}
                    </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Empty State */}
            {!selectedClass && classes.length === 0 && (
              <div className="clay-card p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ListChecks className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Anda belum ditugaskan sebagai wali kelas. Hubungi admin untuk penugasan.
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB: MAPEL (subject attendance) */}
        {tab === "mapel" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">Presensi Per Mata Pelajaran</h1>
                <p className="text-sm text-muted-foreground">
                  Presensi hari ini — {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            {schedules.length === 0 && (
              <div className="clay-card p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Tidak ada jadwal mengajar untuk hari ini
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => {
                const now = new Date();
                const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                const isBefore = schedule.start_time && currentHHMM < schedule.start_time.slice(0, 5);
                const isAfter = schedule.end_time && currentHHMM > schedule.end_time.slice(0, 5);
                const cardDisabled = isSakitOrIzin || currentStatus === "alpa" || hasCheckedOut || !!isBefore || !!isAfter;

                let disableReason = "";
                if (isSakitOrIzin) disableReason = "Sedang sakit/izin";
                else if (currentStatus === "alpa") disableReason = "Alpa";
                else if (hasCheckedOut) disableReason = "Sudah presensi pulang";
                else if (!!isBefore) disableReason = "Belum jam mengajar";
                else if (!!isAfter) disableReason = "Jam pelajaran telah berakhir. Presensi siswa tidak dapat dilakukan";

                return (
                <div key={schedule.id} className="clay-card p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-foreground break-words">
                        {schedule.subject_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {schedule.class_name} · {schedule.start_time?.slice(0, 5)}-{schedule.end_time?.slice(0, 5)}
                        {schedule.room ? ` · ${schedule.room}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-3 mt-3">
                    {cardDisabled && (
                      <p className="text-xs text-muted-foreground/70 mb-2 font-medium">{disableReason}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {schedule.teacher_status ? (
                        <div className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-xl border-2 w-full ${
                          schedule.teacher_status === "hadir_di_kelas"
                            ? "bg-success/10 text-success border-success/20"
                            : schedule.teacher_status === "penugasan"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}>
                          {schedule.teacher_status === "hadir_di_kelas" && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                          {schedule.teacher_status === "penugasan" && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                          {schedule.teacher_status === "alpa" && <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                          {schedule.teacher_status === "hadir_di_kelas" ? "Hadir di Kelas" : schedule.teacher_status === "penugasan" ? "Penugasan" : "Alpa"}
                        </div>
                      ) : (
                        <button
                          disabled={cardDisabled}
                          onClick={() => !cardDisabled && setTeacherStatusOpen(schedule)}
                          className={`w-full px-2.5 py-2 text-xs font-bold rounded-xl border-2 clay-transition ${
                            cardDisabled
                              ? "bg-muted/50 text-muted-foreground/50 border-border/30 cursor-not-allowed"
                              : "bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary cursor-pointer"
                          }`}
                        >
                          Belum Presensi
                        </button>
                      )}
                      <button
                        disabled={cardDisabled}
                        onClick={() => !cardDisabled && openSubjectAttendance(schedule)}
                        className={`w-full px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 ${
                          cardDisabled
                            ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            : "clay-button cursor-pointer text-white"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Presensi Siswa
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Teacher Self-Attendance Modal */}
        <Dialog open={!!teacherStatusOpen} onOpenChange={(open) => { if (!open) setTeacherStatusOpen(null); }}>
          <DialogContent className="sm:max-w-[400px] clay-card border-0 p-0">
            <div className="p-6 text-center">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl font-bold">Status Kehadiran Guru</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                {teacherStatusOpen?.subject_name} · {teacherStatusOpen?.class_name}
              </p>
              {(() => {
                const ts = teacherStatusOpen;
                const teacherNowHHMM = (() => {
                  const d = new Date();
                  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })();
                const teacherTimeDisabled = !ts || !!(
                  (ts.start_time && teacherNowHHMM < ts.start_time.slice(0, 5)) ||
                  (ts.end_time && teacherNowHHMM > ts.end_time.slice(0, 5))
                );

                return (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => !teacherTimeDisabled && ts && markTeacherStatus(ts, "hadir_di_kelas")}
                      disabled={teacherTimeDisabled}
                      className={`w-full py-4 px-6 rounded-2xl font-bold text-base clay-transition flex items-center justify-center gap-3 ${
                        teacherTimeDisabled
                          ? "bg-muted/50 text-muted-foreground/50 border-2 border-border/30 cursor-not-allowed"
                          : "bg-success/10 border-2 border-success/20 text-success hover:bg-success/20 cursor-pointer"
                      }`}
                    >
                      <CheckCircle className="h-6 w-6" />
                      Hadir di Kelas
                    </button>
                    <button
                      onClick={() => !teacherTimeDisabled && ts && markTeacherStatus(ts, "penugasan")}
                      disabled={teacherTimeDisabled}
                      className={`w-full py-4 px-6 rounded-2xl font-bold text-base clay-transition flex items-center justify-center gap-3 ${
                        teacherTimeDisabled
                          ? "bg-muted/50 text-muted-foreground/50 border-2 border-border/30 cursor-not-allowed"
                          : "bg-warning/10 border-2 border-warning/20 text-warning hover:bg-warning/20 cursor-pointer"
                      }`}
                    >
                      <AlertTriangle className="h-6 w-6" />
                      Penugasan Siswa
                    </button>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Subject Attendance Modal */}
        <Dialog
          open={subjectAttendanceModal.open}
          onOpenChange={(open) => {
            if (!open) setSubjectAttendanceModal({ open: false, schedule: null });
          }}
        >
          <DialogContent className="sm:max-w-[700px] clay-card border-0 !p-0">
            <div className="p-6 min-w-0">
              <h2 className="font-heading text-xl font-bold text-foreground text-left break-words">
                Presensi {subjectAttendanceModal.schedule?.subject_name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {subjectAttendanceModal.schedule?.class_name} ·{' '}
                {subjectAttendanceModal.schedule?.start_time?.slice(0, 5)}-{subjectAttendanceModal.schedule?.end_time?.slice(0, 5)}
                {subjectAttendanceModal.schedule?.room ? ` · ${subjectAttendanceModal.schedule.room}` : ""}
              </p>

              <div className="max-h-[400px] overflow-y-auto overflow-x-auto border border-border/50 rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Siswa</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectStudents.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-8 text-muted-foreground">Tidak ada siswa aktif di kelas ini</td>
                      </tr>
                    ) : (
                      (() => {
                        const schedule = subjectAttendanceModal.schedule;
                        const scheduleNowHHMM = (() => {
                          const d = new Date();
                          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        })();
                        const scheduleTimeDisabled = !schedule || !!(
                          (schedule.start_time && scheduleNowHHMM < schedule.start_time.slice(0, 5)) ||
                          (schedule.end_time && scheduleNowHHMM > schedule.end_time.slice(0, 5))
                        );

                        return (
                          <>
                            {scheduleTimeDisabled && (
                              <tr>
                                <td colSpan={2}>
                                  <div className="flex items-center gap-2 mx-4 my-3 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm font-medium">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>Di luar jam pelajaran. Presensi siswa tidak dapat dilakukan.</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan={2}>
                                <div className="flex justify-start px-4 py-2">
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
                              </td>
                            </tr>
                            {subjectStudents.map((student) => {
                          const currentStatus = subjectAttendanceMap[student.id];
                          return (
                            <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-foreground">{student.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{student.nis}</p>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {currentStatus ? (
<span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-xl border-2 ${
  currentStatus === "hadir" ? "bg-success/10 text-success border-success/20" :
  currentStatus === "terlambat" ? "bg-warning/10 text-warning border-warning/20" :
  currentStatus === "sakit" ? "bg-warning/10 text-warning border-warning/20" :
  currentStatus === "izin" ? "bg-info/10 text-info border-info/20" :
  currentStatus === "dispen" ? "bg-sky-100 text-sky-600 border-sky-200" :
  "bg-destructive/10 text-destructive border-destructive/20"
}`}>
  {currentStatus === "hadir" ? "Hadir" : currentStatus === "terlambat" ? "Terlambat" : currentStatus === "sakit" ? "Sakit" : currentStatus === "izin" ? "Izin" : currentStatus === "dispen" ? "Dispen" : "Alpa"}
</span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs font-bold rounded-xl bg-muted text-muted-foreground border-2 border-border">
                                      —
                                    </span>
                                  )}
                                  {(["hadir", "sakit", "izin", "dispen", "alpa"] as const).map((st) => {
                                    const isDisabled = scheduleTimeDisabled;
                                    const title = scheduleTimeDisabled ? "Di luar jam pelajaran" : "";
                                    return (
                                      <button
                                        key={st}
                                        onClick={() => !isDisabled && markSubjectAttendance(student.id, st)}
                                        disabled={isDisabled}
                                        title={title}
                                        className={`w-7 h-7 rounded-xl text-[11px] font-bold clay-transition cursor-pointer ${
                                          isDisabled
                                            ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                                            : currentStatus === st
                                              ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(79,70,229,0.3)]"
                                              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                        }`}
                                      >
                  {st === "hadir" ? "H" : st === "sakit" ? "S" : st === "izin" ? "I" : st === "dispen" ? "D" : "A"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })()
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4 pt-4 border-t border-border/50">
                <button
                  onClick={() => setSubjectAttendanceModal({ open: false, schedule: null })}
                  className="clay-button px-5 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SkeletonWrapper>
  );
}
