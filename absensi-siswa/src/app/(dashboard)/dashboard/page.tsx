"use client";

import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Stethoscope,
  ClipboardCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  MapPin,
  GraduationCap,
  Filter,
  CalendarOff,
  QrCode,
  BookOpen,
  AlertTriangle,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton, SkeletonStats, SkeletonChart, SkeletonTable } from "@/components/skeleton";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { fetchHolidays, getHolidayName } from "@/lib/holidays";
import { isSchoolDay, getPrevSchoolDays, isTodaySchoolDay, formatDateLocal } from "@/lib/helpers";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import StudentListModal from "@/components/StudentListModal";
import ScanResultModal from "@/components/ScanResultModal";
import { toast } from "sonner";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });

interface Stats {
  totalStudents: number;
  hadir: number;
  terlambat: number;
  alpa: number;
  sakit: number;
  izin: number;
  dispen: number;
}

interface DailyData {
  day: string;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
}

interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  date: string;
  login_time: string | null;
  logout_time: string | null;
  status: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
}

interface TeacherWithAttendance {
  id: string;
  name: string;
  role: string;
  attendance: TeacherAttendanceRecord | null;
}

interface TeacherStats {
  total: number;
  hadir: number;
  terlambat: number;
  belumPresensi: number;
}

interface SubjectTeacherRecord {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name: string;
  class_name: string;
  teacher_name: string;
  teacher_id: string;
  teacher_attendance_status: string | null;
  created_at: string | null;
}

interface ClassInfo {
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

const StatCard = memo(function StatCard({
  title, value, icon: Icon, color, bgColor, cardBg, onClick,
}: {
  title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; cardBg?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`clay-card p-5 group ${onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : "cursor-default"} clay-transition`}
      style={cardBg ? { background: cardBg } : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-muted-foreground">{title}</p>
        <div className={`p-2.5 rounded-xl ${bgColor} clay-transition group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
    </div>
  );
});

const TeacherStatusBadge = memo(function TeacherStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    hadir: { bg: "bg-success/10 border-success/20", text: "text-success", label: "Hadir" },
    terlambat: { bg: "bg-warning/10 border-warning/20", text: "text-warning", label: "Terlambat" },
    sakit: { bg: "bg-teal-100 border-teal-200", text: "text-teal-600", label: "Sakit" },
    izin: { bg: "bg-secondary/10 border-secondary/20", text: "text-secondary-foreground", label: "Izin" },
    alpa: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", label: "Alpa" },
    pulang: { bg: "bg-amber-100 border-amber-200", text: "text-amber-600", label: "Pulang" },
  };
  const c = config[status] || config.alpa;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border-2 rounded-xl whitespace-nowrap ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
});

const TeacherTableRow = memo(function TeacherTableRow({
  teacher,
  onMark,
  timeDisabled,
  timeDisabledReason,
}: {
  teacher: TeacherWithAttendance;
  onMark: (teacherId: string, status: string) => void;
  timeDisabled: boolean;
  timeDisabledReason: string;
}) {
  const formatTime = (iso: string | null): string => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const roleBadge = teacher.role === "tenaga_kependidikan"
    ? <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-yellow-100 text-yellow-600 border border-yellow-200">TK</span>
    : null;

  const actionButtons = [
    { label: "Hadir", status: "hadir", color: "bg-success/10 text-success border-success/20 hover:bg-success/20" },
    { label: "Terlambat", status: "terlambat", color: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" },
    { label: "Sakit", status: "sakit", color: "bg-teal-100 text-teal-600 border-teal-200 hover:bg-teal-200" },
    { label: "Izin", status: "izin", color: "bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200" },
    { label: "Alpa", status: "alpa", color: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" },
    { label: "Pulang", status: "pulang", color: "bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200" },
  ];

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
      <td className="px-4 py-3 font-medium">
        {teacher.name}
        {roleBadge}
      </td>
      <td className="px-4 py-3 text-center">
        {teacher.attendance ? (
          <TeacherStatusBadge status={teacher.attendance.status} />
        ) : (
          <span className="inline-flex items-center text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-xl border-2 border-border whitespace-nowrap">
            Belum Presensi
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-sm">{formatTime(teacher.attendance?.login_time ?? null)}</td>
      <td className="px-4 py-3 text-center text-sm">{formatTime(teacher.attendance?.logout_time ?? null)}</td>
      <td className="px-4 py-3 text-center">
        {teacher.attendance?.location_lat && teacher.attendance?.location_lng ? (
          <a
            href={`https://www.google.com/maps?q=${teacher.attendance.location_lat},${teacher.attendance.location_lng}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <MapPin className="h-3 w-3" /> Lihat
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="flex gap-1 justify-end">
          {actionButtons.map((btn) => {
            const isPulang = btn.status === "pulang";
            const disabled = timeDisabled || (isPulang
              ? !teacher.attendance?.login_time || !!teacher.attendance?.logout_time
              : false);
            let title = "";
            if (timeDisabled) title = timeDisabledReason;
            else if (isPulang && !teacher.attendance?.login_time) title = "Guru belum presensi masuk";
            else if (isPulang && !!teacher.attendance?.logout_time) title = "Sudah presensi pulang";
            return (
              <button
                key={btn.status}
                onClick={() => !disabled && onMark(teacher.id, btn.status)}
                disabled={disabled}
                title={title}
                className={`px-1.5 py-1 text-[10px] font-bold rounded-lg border-2 clay-transition cursor-pointer leading-tight ${
                  disabled
                    ? "bg-muted/40 text-muted-foreground/40 border-border/20 cursor-not-allowed opacity-50"
                    : btn.color
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
});

function formatShortDayLabel(dateStr: string): string {
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const d = new Date(dateStr + "T00:00:00");
  const dayName = dayNames[d.getDay()];
  const dateNum = d.getDate();
  return `${dayName} ${dateNum}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
      </div>
      <SkeletonStats count={6} />
      <SkeletonChart />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-2xl" />
        <div>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <SkeletonStats count={4} />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}

const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-right text-xs text-muted-foreground leading-tight block ml-auto">
      <div>{time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <div className="font-semibold text-foreground tabular-nums">{time.toLocaleTimeString("id-ID")}</div>
    </div>
  );
});

export default function DashboardPage() {
  const SIMULASI_MODE = false;
  const SIMULASI_DATE = "2026-07-19";

  const supabase = createClient();
  const router = useRouter();
  const { user, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  const [classList, setClassList] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const [stats, setStats] = useState<Stats>({ totalStudents: 0, hadir: 0, terlambat: 0, alpa: 0, sakit: 0, izin: 0, dispen: 0 });
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);

  // Student list modal state
  const [studentModal, setStudentModal] = useState<{
    open: boolean;
    title: string;
    status: string | null;
  }>({ open: false, title: "", status: null });

  const [teachers, setTeachers] = useState<TeacherWithAttendance[]>([]);
  const [teacherPage, setTeacherPage] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [holidays, setHolidays] = useState<string[]>([]);
  const [todayIsSchoolDay, setTodayIsSchoolDay] = useState(true);
  const [holidayName, setHolidayName] = useState<string | null>(null);

  // Subject teacher monitoring state
  const [subjectDate, setSubjectDate] = useState(SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal());
  const [subjectTeachers, setSubjectTeachers] = useState<SubjectTeacherRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Barcode scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined);
  const [scanResultOpen, setScanResultOpen] = useState(false);

  const openScanner = () => {
    setScannedBarcode(undefined);
    setScannerOpen(true);
  };

const closeScanner = () => {
    setScannerOpen(false);
    setScannedBarcode(undefined);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    setScannerOpen(false);
    setScanResultOpen(true);
  };

  const closeScanResult = () => {
    setScanResultOpen(false);
    setScannedBarcode(undefined);
  };

  const currentYear = new Date().getFullYear();

  const fetchSubjectTeachers = useCallback(async (dateStr: string, holidayDates: string[]) => {
    const selectedDate = new Date(dateStr + "T00:00:00");
    const dayOfWeek = SIMULASI_MODE ? 2 : selectedDate.getDay();
    const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    const dow = dayMap[dayOfWeek];
    if (!dow) { setSubjectTeachers([]); return; }

    const { data } = await supabase
      .from("schedules")
      .select(`
        id, start_time, end_time, room,
        teacher_subjects!inner(
          teacher_id, subject_id, class_id,
          subjects!inner(name),
          classes!inner(name),
          users!inner(name)
        )
      `)
      .eq("day_of_week", dow)
      .order("start_time");

    if (!data) { setSubjectTeachers([]); return; }

    const mapped: SubjectTeacherRecord[] = data.map((s: any) => ({
      id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room,
      subject_name: s.teacher_subjects.subjects.name,
      class_name: s.teacher_subjects.classes.name,
      teacher_name: s.teacher_subjects.users.name,
      teacher_id: s.teacher_subjects.teacher_id,
      teacher_attendance_status: null,
    }));

    const scheduleIds = mapped.map((m) => m.id);
    const teacherIds = [...new Set(mapped.map((m) => m.teacher_id))];

    if (scheduleIds.length > 0) {
      const { data: tsaData } = await supabase
        .from("teacher_subject_attendances")
        .select("schedule_id, teacher_id, status, created_at")
        .eq("date", dateStr)
        .in("teacher_id", teacherIds)
        .in("schedule_id", scheduleIds);

      const statusMap: Record<string, string> = {};
      const createdAtMap: Record<string, string> = {};
      tsaData?.forEach((tsa: { schedule_id: string; status: string; created_at: string | null }) => {
        statusMap[tsa.schedule_id] = tsa.status;
        if (tsa.created_at) createdAtMap[tsa.schedule_id] = tsa.created_at;
      });
      mapped.forEach((m) => {
        m.teacher_attendance_status = statusMap[m.id] || null;
        m.created_at = createdAtMap[m.id] || null;
      });
    }

    setSubjectTeachers(mapped);
  }, [supabase]);

  const fetchTeacherAttendance = useCallback(async (todayDate: string, holidayDates: string[]) => {
    const { data: usersData } = await supabase.from("users").select("id, name, role").in("role", ["guru", "tenaga_kependidikan"]).order("name");
    if (!usersData) return;
    const teacherIds = usersData.map((u: { id: string }) => u.id);
    const isSD = SIMULASI_MODE ? true : isSchoolDay(todayDate, holidayDates);
    if (isSD) {
      const { data: attData } = await supabase.from("teacher_attendance").select("*").eq("date", todayDate).in("teacher_id", teacherIds);
      const attMap: Record<string, TeacherAttendanceRecord> = {};
      attData?.forEach((a: TeacherAttendanceRecord) => { attMap[a.teacher_id] = a; });
      setTeachers(usersData.map((u: { id: string; name: string; role: string }) => ({ id: u.id, name: u.name, role: u.role, attendance: attMap[u.id] || null })));
    } else {
      setTeachers(usersData.map((u: { id: string; name: string; role: string }) => ({ id: u.id, name: u.name, role: u.role, attendance: null })));
    }
  }, [supabase]);

  async function markTeacherAttendance(teacherId: string, status: string) {
    const today = SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal();
    if (status === "pulang") {
      const { error } = await supabase.from("teacher_attendance").upsert(
        { teacher_id: teacherId, date: today, status: "pulang", logout_time: new Date().toISOString() },
        { onConflict: "teacher_id,date" }
      );
      if (error) { toast.error("Gagal menyimpan presensi pulang"); return; }
      toast.success("Presensi pulang berhasil disimpan");
    } else {
      const { error } = await supabase.from("teacher_attendance").upsert(
        { teacher_id: teacherId, date: today, status },
        { onConflict: "teacher_id,date" }
      );
      if (error) { toast.error("Gagal menyimpan presensi"); return; }
      toast.success("Presensi berhasil disimpan");
    }
    const todayDate = SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal();
    fetchTeacherAttendance(todayDate, holidays);
  }

  async function handleManualAttendance(scheduleId: string, teacherId: string, status: string) {
    const { error } = await supabase.from("teacher_subject_attendances").upsert(
      { schedule_id: scheduleId, teacher_id: teacherId, status, date: subjectDate },
      { onConflict: "schedule_id,teacher_id,date" }
    );
    if (error) { toast.error("Gagal memperbarui status"); return; }
    setSubjectTeachers((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, teacher_attendance_status: status } : s))
    );
  }

  const fetchClassData = useCallback(async (classId: string, holidayDates: string[]) => {
    const today = SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal();
    const todayIsSD = SIMULASI_MODE ? true : isSchoolDay(today, holidayDates);

    if (classId === "all") {
      if (todayIsSD) {
        const { count: totalStudents } = await supabase
          .from("students").select("*", { count: "exact", head: true }).eq("status", "active");

        const { data: todayAttendance } = await supabase
          .from("attendance").select("student_id, masuk_status, late_status").eq("date", today);

        const counts = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        todayAttendance?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null }) => {
          if (a.masuk_status === 'hadir') {
            if (a.late_status === 'terlambat') counts.terlambat++;
            else counts.hadir++;
          } else if (a.masuk_status === 'sakit') counts.sakit++;
          else if (a.masuk_status === 'izin') counts.izin++;
          else if (a.masuk_status === 'dispen') counts.dispen++;
          else if (a.masuk_status === 'alpa') counts.alpa++;
        });
        setStats({ totalStudents: totalStudents || 0, ...counts });
      } else {
        const { count: totalStudents } = await supabase
          .from("students").select("*", { count: "exact", head: true }).eq("status", "active");
        setStats({ totalStudents: totalStudents || 0, hadir: 0, terlambat: 0, alpa: 0, sakit: 0, izin: 0, dispen: 0 });
      }

      const prevSchoolDays = getPrevSchoolDays(5, holidayDates);
      const earliestDate = prevSchoolDays[0];
      const { data: weekAttendance } = await supabase
        .from("attendance").select("student_id, masuk_status, late_status, date").gte("date", earliestDate).lte("date", today);

      const dateMap: Record<string, { hadir: number; terlambat: number; sakit: number; izin: number; dispen: number; alpa: number }> = {};
      prevSchoolDays.forEach((ds) => { dateMap[ds] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 }; });

      weekAttendance?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null; date: string }) => {
        if (!dateMap[a.date]) return;
        if (a.masuk_status === 'hadir') {
          if (a.late_status === 'terlambat') dateMap[a.date].terlambat++;
          else dateMap[a.date].hadir++;
        } else if (a.masuk_status === 'sakit') dateMap[a.date].sakit++;
        else if (a.masuk_status === 'izin') dateMap[a.date].izin++;
        else if (a.masuk_status === 'dispen') dateMap[a.date].dispen++;
        else if (a.masuk_status === 'alpa') dateMap[a.date].alpa++;
      });

      setWeeklyData(prevSchoolDays.map((ds) => ({ day: formatShortDayLabel(ds), ...dateMap[ds] })));
    } else {
      if (todayIsSD) {
        const { count: totalStudents } = await supabase
          .from("students").select("*", { count: "exact", head: true }).eq("class_id", classId).eq("status", "active");

        const { data: classStudents } = await supabase
          .from("students").select("id").eq("class_id", classId).eq("status", "active");
        const studentIds = classStudents?.map((s: { id: string }) => s.id) || [];

        const { data: todayAttendance } = await supabase
          .from("attendance").select("student_id, masuk_status, late_status").eq("date", today).in("student_id", studentIds);

        const counts = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 };
        todayAttendance?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null }) => {
          if (a.masuk_status === 'hadir') {
            if (a.late_status === 'terlambat') counts.terlambat++;
            else counts.hadir++;
          } else if (a.masuk_status === 'sakit') counts.sakit++;
          else if (a.masuk_status === 'izin') counts.izin++;
          else if (a.masuk_status === 'dispen') counts.dispen++;
          else if (a.masuk_status === 'alpa') counts.alpa++;
        });
        setStats({ totalStudents: totalStudents || 0, ...counts });
      } else {
        const { count: totalStudents } = await supabase
          .from("students").select("*", { count: "exact", head: true }).eq("class_id", classId).eq("status", "active");
        setStats({ totalStudents: totalStudents || 0, hadir: 0, terlambat: 0, alpa: 0, sakit: 0, izin: 0, dispen: 0 });
      }

      const { data: classStudents } = await supabase
        .from("students").select("id").eq("class_id", classId).eq("status", "active");
      const studentIds = classStudents?.map((s: { id: string }) => s.id) || [];

      const prevSchoolDays = getPrevSchoolDays(5, holidayDates);
      const earliestDate = prevSchoolDays[0];
      const { data: weekAttendance } = await supabase
        .from("attendance").select("student_id, masuk_status, late_status, date").gte("date", earliestDate).lte("date", today).in("student_id", studentIds);

      const dateMap: Record<string, { hadir: number; terlambat: number; sakit: number; izin: number; dispen: number; alpa: number }> = {};
      prevSchoolDays.forEach((ds) => { dateMap[ds] = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, dispen: 0, alpa: 0 }; });

      weekAttendance?.forEach((a: { student_id: string; masuk_status: string | null; late_status: string | null; date: string }) => {
        if (!dateMap[a.date]) return;
        if (a.masuk_status === 'hadir') {
          if (a.late_status === 'terlambat') dateMap[a.date].terlambat++;
          else dateMap[a.date].hadir++;
        } else if (a.masuk_status === 'sakit') dateMap[a.date].sakit++;
        else if (a.masuk_status === 'izin') dateMap[a.date].izin++;
        else if (a.masuk_status === 'dispen') dateMap[a.date].dispen++;
        else if (a.masuk_status === 'alpa') dateMap[a.date].alpa++;
      });

      setWeeklyData(prevSchoolDays.map((ds) => ({ day: formatShortDayLabel(ds), ...dateMap[ds] })));
    }
  }, [supabase]);

  useEffect(() => {
    if (!user) return;

    async function init() {
      setLoading(true);

      const today = SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal();

      const [holidayDates, settingsResult, userResult] = await Promise.all([
        fetchHolidays(currentYear),
        supabase.from("settings").select("key, value"),
        supabase.from("users").select("role, name").eq("id", userId).maybeSingle(),
      ]);
      setHolidays(holidayDates);

      const { data: settingsData } = settingsResult;
      if (settingsData) {
        const map: Record<string, string> = {};
        settingsData.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
        setSettings(map as unknown as Settings);
      }

      const isSD = SIMULASI_MODE ? true : isTodaySchoolDay(holidayDates);
      setTodayIsSchoolDay(isSD);

      if (!isSD) {
        const isWeekend = new Date(today + "T00:00:00").getDay() === 0 || new Date(today + "T00:00:00").getDay() === 6;
        if (isWeekend) {
          setHolidayName("hari libur/tanggal merah");
        } else {
          const name = await getHolidayName(today);
          setHolidayName(name || "hari libur/tanggal merah");
        }
      }

      const { data: userData } = userResult;
      if (userData?.role === "siswa") { router.push("/siswa/presensi"); return; }

      const role = userData?.role || "";
      const uname = userData?.name || "";
      setUserRole(role);
      setUserName(uname);

      if (role === "guru") {
        const [allClassesResult, myClassResult] = await Promise.all([
          supabase.from("classes").select("id, name").order("name"),
          supabase.from("classes").select("id").eq("wali_kelas_id", userId).maybeSingle(),
        ]);
        const guruClasses = allClassesResult.data || [];
        setClassList(guruClasses);
        const defaultId = myClassResult.data?.id || guruClasses[0]?.id || "all";
        setSelectedClassId(defaultId);
        await fetchClassData(defaultId, holidayDates);
      } else {
        const { data: allClasses } = await supabase.from("classes").select("id, name").order("name");
        setClassList(allClasses || []);
        setSelectedClassId("all");
        await fetchClassData("all", holidayDates);
      }

      // Fetch subject teacher attendance + teacher attendance (for admin)
      if (role === "admin") {
        await Promise.all([
          fetchSubjectTeachers(today, holidayDates),
          fetchTeacherAttendance(today, holidayDates),
        ]);
      }

      setLoading(false);
    }

    init();
  }, [supabase, router, user, userId, fetchClassData, currentYear]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassData(selectedClassId, holidays);
    }
  }, [selectedClassId, fetchClassData, holidays]);

  // Real-time subscription for attendance changes
  useEffect(() => {
    const today = formatDateLocal();
    const channel = supabase
      .channel("dashboard-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `date=eq.${today}` }, () => {
        fetchClassData(selectedClassId, holidays);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, selectedClassId, holidays, fetchClassData]);

  // Auto-refresh when tab becomes visible (e.g., next day)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && selectedClassId) {
        fetchClassData(selectedClassId, holidays);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [selectedClassId, holidays, fetchClassData]);

  // Real-time subscription for teacher_subject_attendances (Pantau Guru)
  useEffect(() => {
    if (userRole !== "admin") return;
    const channel = supabase
      .channel("dashboard-subject-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_subject_attendances", filter: `date=eq.${subjectDate}` }, () => {
        fetchSubjectTeachers(subjectDate, holidays);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, userRole, subjectDate, holidays, fetchSubjectTeachers]);

  // Real-time subscription for teacher_attendance (Kehadiran Harian Guru)
  useEffect(() => {
    if (userRole !== "admin") return;
    const today = SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal();
    const channel = supabase
      .channel("dashboard-teacher-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_attendance", filter: `date=eq.${today}` }, () => {
        fetchTeacherAttendance(today, holidays);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, userRole, holidays, fetchTeacherAttendance]);

  const teacherStats = useMemo<TeacherStats>(() => {
    const total = teachers.length;
    const hadir = teachers.filter((t) => t.attendance?.status === "hadir").length;
    const terlambat = teachers.filter((t) => t.attendance?.status === "terlambat").length;
    const belumPresensi = teachers.filter((t) => !t.attendance).length;
    return { total, hadir, terlambat, belumPresensi };
  }, [teachers]);

  const nowHHMM = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();
  const isBeforeHours = settings ? nowHHMM < settings.morning_start : false;
  const isAfterHours = settings ? nowHHMM > settings.afternoon_end : false;
  const timeDisabled = todayIsSchoolDay && (isBeforeHours || isAfterHours);
  const timeDisabledReason = isBeforeHours ? "Belum jam masuk" : isAfterHours ? "Jam pulang sudah berakhir" : "";

  const selectedClassName = useMemo(() => {
    if (selectedClassId === "all") return null;
    return classList.find((c) => c.id === selectedClassId)?.name || null;
  }, [selectedClassId, classList]);

  const statCards = useMemo(() => [
    { title: "Total Siswa", value: stats.totalStudents, modalTitle: "Semua Siswa", modalStatus: null, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50", cardBg: "#EFF6FF" },
    { title: "Hadir", value: stats.hadir, modalTitle: "Siswa Hadir", modalStatus: "hadir", icon: UserCheck, color: "text-emerald-600", bgColor: "bg-emerald-50", cardBg: "#ECFDF5" },
    { title: "Terlambat", value: stats.terlambat, modalTitle: "Siswa Terlambat", modalStatus: "terlambat", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50", cardBg: "#FFFBEB" },
    { title: "Alpa", value: stats.alpa, modalTitle: "Siswa Alpa", modalStatus: "alpa", icon: UserX, color: "text-red-600", bgColor: "bg-red-50", cardBg: "#FEF2F2" },
    { title: "Sakit", value: stats.sakit, modalTitle: "Siswa Sakit", modalStatus: "sakit", icon: Stethoscope, color: "text-teal-600", bgColor: "bg-teal-50", cardBg: "#F0FDFA" },
    { title: "Izin", value: stats.izin, modalTitle: "Siswa Izin", modalStatus: "izin", icon: ClipboardCheck, color: "text-purple-600", bgColor: "bg-purple-50", cardBg: "#FAF5FF" },
    { title: "Dispen", value: stats.dispen, modalTitle: "Siswa Dispen", modalStatus: "dispen", icon: ClipboardCheck, color: "text-sky-600", bgColor: "bg-sky-50", cardBg: "#F0F9FF" },
  ], [stats]);

  const teacherStatCards = useMemo(() => [
    { title: "Total Guru", value: teacherStats.total, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50", cardBg: "#EFF6FF" },
    { title: "Hadir", value: teacherStats.hadir, icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50", cardBg: "#ECFDF5" },
    { title: "Terlambat", value: teacherStats.terlambat, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50", cardBg: "#FFFBEB" },
    { title: "Belum Presensi", value: teacherStats.belumPresensi, icon: XCircle, color: "text-red-600", bgColor: "bg-red-50", cardBg: "#FEF2F2" },
  ], [teacherStats]);

  const isGuru = userRole === "guru";
  const isAdmin = userRole === "admin";
  const headingTitle = userRole === "" ? "Dashboard" : isGuru ? "Dashboard Guru" : "Dashboard Admin";

  // Filter & pagination for Pantau Guru
  const filteredSubjectTeachers = subjectTeachers.filter((s) =>
    s.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredSubjectTeachers.length / ITEMS_PER_PAGE);
  const paginatedSubjectTeachers = filteredSubjectTeachers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <SkeletonWrapper loading={loading} skeleton={<DashboardSkeleton />}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            {isGuru ? <GraduationCap className="h-6 w-6 text-primary" /> : <TrendingUp className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">{headingTitle}</h1>
            <p className="text-sm text-muted-foreground">Selamat datang, {userName}!</p>
          </div>
        </div>
        {/* Real-time Clock */}
        <LiveClock />
        {/* Scan Barcode Button for Guru & Admin */}
        {(isGuru || isAdmin) && (
          <button
            onClick={openScanner}
            className="clay-button px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <QrCode className="h-4 w-4" />
            Scan Barcode
          </button>
        )}
      </div>

      {/* Libur Banner */}
      {!todayIsSchoolDay && (
        <div className="clay-card p-5 border-2 border-amber-200 bg-amber-50 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-2xl">
            <CalendarOff className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="font-heading font-bold text-amber-800">Hari libur</p>
            <p className="text-sm text-amber-600">{holidayName || "hari libur/tanggal merah"} — Tidak ada aktivitas presensi hari ini.</p>
          </div>
        </div>
      )}

      {/* Class Filter */}
      {classList.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="clay-input px-4 py-2 text-sm rounded-xl outline-none cursor-pointer font-bold"
          >
            <option value="all">Semua Kelas</option>
            {classList.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
          </select>
        </div>
      )}

      {/* Student Stats Grid */}
      {todayIsSchoolDay ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              bgColor={card.bgColor}
              cardBg={card.cardBg}
              onClick={() => setStudentModal({ open: true, title: card.modalTitle, status: card.modalStatus })}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Siswa" value={stats.totalStudents} icon={Users} color="text-blue-600" bgColor="bg-blue-50" cardBg="#EFF6FF" onClick={() => setStudentModal({ open: true, title: "Semua Siswa", status: null })} />
          <StatCard title="Hadir" value={0} icon={UserCheck} color="text-emerald-600" bgColor="bg-emerald-50" cardBg="#ECFDF5" onClick={() => setStudentModal({ open: true, title: "Siswa Hadir", status: "hadir" })} />
          <StatCard title="Terlambat" value={0} icon={Clock} color="text-amber-600" bgColor="bg-amber-50" cardBg="#FFFBEB" onClick={() => setStudentModal({ open: true, title: "Siswa Terlambat", status: "terlambat" })} />
          <StatCard title="Alpa" value={0} icon={UserX} color="text-red-600" bgColor="bg-red-50" cardBg="#FEF2F2" onClick={() => setStudentModal({ open: true, title: "Siswa Alpa", status: "alpa" })} />
          <StatCard title="Sakit" value={0} icon={Stethoscope} color="text-teal-600" bgColor="bg-teal-50" cardBg="#F0FDFA" onClick={() => setStudentModal({ open: true, title: "Siswa Sakit", status: "sakit" })} />
          <StatCard title="Izin" value={0} icon={ClipboardCheck} color="text-purple-600" bgColor="bg-purple-50" cardBg="#FAF5FF" onClick={() => setStudentModal({ open: true, title: "Siswa Izin", status: "izin" })} />
          <StatCard title="Dispen" value={0} icon={ClipboardCheck} color="text-sky-600" bgColor="bg-sky-50" cardBg="#F0F9FF" onClick={() => setStudentModal({ open: true, title: "Siswa Dispen", status: "dispen" })} />
        </div>
      )}

      {/* Weekly Chart */}
      <div className="clay-card p-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4 text-center">
          Kehadiran Siswa 5 Hari Terakhir{selectedClassName ? ` — ${selectedClassName}` : ""}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
            <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip contentStyle={{ background: "white", border: "none", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Legend />
            <Bar dataKey="hadir" stackId="a" fill="#22C55E" name="Hadir" />
            <Bar dataKey="terlambat" stackId="a" fill="#F59E0B" name="Terlambat" />
            <Bar dataKey="sakit" stackId="a" fill="#14B8A6" name="Sakit" />
            <Bar dataKey="izin" stackId="a" fill="#A855F7" name="Izin" />
            <Bar dataKey="dispen" stackId="a" fill="#0EA5E9" name="Dispen" />
            <Bar dataKey="alpa" stackId="a" fill="#EF4444" name="Alpa" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kehadiran Guru — Admin Only */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Kehadiran Guru dan Tenaga Kependidikan Hari Ini</h2>
              <p className="text-sm text-muted-foreground">Pantau status kehadiran seluruh guru dan tenaga kependidikan</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teacherStatCards.map((card) => (<StatCard key={card.title} {...card} />))}
          </div>

          <div className="clay-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-heading font-bold text-foreground">Daftar Guru dan Tenaga Kependidikan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Jam Masuk</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Jam Keluar</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Lokasi</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.slice(teacherPage * 5, teacherPage * 5 + 5).map((t) => (
                    <TeacherTableRow
                      key={t.id}
                      teacher={t}
                      onMark={markTeacherAttendance}
                      timeDisabled={timeDisabled}
                      timeDisabledReason={timeDisabledReason}
                    />
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data guru dan tenaga kependidikan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {teachers.length > 5 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border/50">
                <button
                  disabled={teacherPage === 0}
                  onClick={() => setTeacherPage((p) => Math.max(0, p - 1))}
                  className="clay-button px-3 py-1.5 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-muted-foreground">
                  {teacherPage + 1} / {Math.ceil(teachers.length / 5)}
                </span>
                <button
                  disabled={teacherPage >= Math.ceil(teachers.length / 5) - 1}
                  onClick={() => setTeacherPage((p) => p + 1)}
                  className="clay-button px-3 py-1.5 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pantau Guru (Presensi Mapel) — Admin Only */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Pantau Guru</h2>
              <p className="text-sm text-muted-foreground">Pantau status kehadiran guru per mata pelajaran</p>
            </div>
          </div>
          {SIMULASI_MODE && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2 text-xs font-bold text-amber-700">
              🔬 Mode Simulasi — Data menggunakan tanggal {SIMULASI_DATE}
            </div>
          )}

          {/* Date Filter & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[180px]">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={subjectDate}
                onChange={async (e) => {
                  setSubjectDate(e.target.value);
                  const holidayDates = await fetchHolidays(currentYear);
                  fetchSubjectTeachers(e.target.value, holidayDates);
                }}
                className="clay-input pl-9 pr-3 py-2 text-sm rounded-xl outline-none cursor-pointer font-bold w-full"
              />
            </div>
            <div className="relative w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama guru..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="clay-input pl-10 pr-4 py-2 text-sm rounded-xl outline-none w-full"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="clay-card p-4">
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <span>Total: <strong>{filteredSubjectTeachers.length}</strong> jadwal</span>
              <span className="text-success">Hadir: <strong>{filteredSubjectTeachers.filter((s) => s.teacher_attendance_status === "hadir_di_kelas").length}</strong></span>
              <span className="text-warning">Penugasan: <strong>{filteredSubjectTeachers.filter((s) => s.teacher_attendance_status === "penugasan").length}</strong></span>
              <span className="text-destructive">Alpa: <strong>{filteredSubjectTeachers.filter((s) => s.teacher_attendance_status === "alpa").length}</strong></span>
              <span className="text-muted-foreground">Belum: <strong>{filteredSubjectTeachers.filter((s) => !s.teacher_attendance_status).length}</strong></span>
            </div>
          </div>

          <div className="clay-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-12">No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Guru</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Mapel</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Kelas</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Jadwal</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Status Guru</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Waktu Presensi</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubjectTeachers.map((s, i) => (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                      <td className="px-4 py-3 font-medium">{s.teacher_name}</td>
                      <td className="px-4 py-3">{s.subject_name}</td>
                      <td className="px-4 py-3">{s.class_name}</td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                        {s.room ? ` (${s.room})` : ""}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.teacher_attendance_status === "hadir_di_kelas" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-xl bg-success/10 text-success border-2 border-success/20 whitespace-nowrap">
                            <CheckCircle className="h-3 w-3" /> Hadir di Kelas
                          </span>
                        ) : s.teacher_attendance_status === "penugasan" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-xl bg-warning/10 text-warning border-2 border-warning/20 whitespace-nowrap">
                            <AlertTriangle className="h-3 w-3" /> Penugasan
                          </span>
                        ) : s.teacher_attendance_status === "alpa" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-xl bg-destructive/10 text-destructive border-2 border-destructive/20 whitespace-nowrap">
                            <XCircle className="h-3 w-3" /> Alpa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-xl bg-muted text-muted-foreground border-2 border-border whitespace-nowrap">
                            <Clock className="h-3 w-3 mr-1" /> Belum Presensi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleManualAttendance(s.id, s.teacher_id, "hadir_di_kelas")}
                            disabled={s.teacher_attendance_status === "hadir_di_kelas"}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-40 disabled:cursor-not-allowed clay-transition cursor-pointer"
                          >
                            Hadir
                          </button>
                          <button
                            onClick={() => handleManualAttendance(s.id, s.teacher_id, "penugasan")}
                            disabled={s.teacher_attendance_status === "penugasan"}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-warning/10 text-warning hover:bg-warning/20 disabled:opacity-40 disabled:cursor-not-allowed clay-transition cursor-pointer"
                          >
                            Tugas
                          </button>
                          <button
                            onClick={() => handleManualAttendance(s.id, s.teacher_id, "alpa")}
                            disabled={s.teacher_attendance_status === "alpa"}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed clay-transition cursor-pointer"
                          >
                            Alpa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSubjectTeachers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "Tidak ada guru yang cocok dengan pencarian" : "Tidak ada jadwal pada tanggal ini"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredSubjectTeachers.length)} dari {filteredSubjectTeachers.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg clay-transition cursor-pointer ${
                        page === currentPage
                          ? "bg-primary text-white"
                          : "hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student List Modal */}
      <StudentListModal
        open={studentModal.open}
        onOpenChange={(open) => setStudentModal((prev) => ({ ...prev, open }))}
        title={studentModal.title}
        status={studentModal.status}
        date={SIMULASI_MODE ? SIMULASI_DATE : formatDateLocal()}
        classId={selectedClassId === "all" ? undefined : selectedClassId}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={closeScanner}
        onScan={handleBarcodeScanned}
      />

      {/* Scan Result Modal */}
      <ScanResultModal
        isOpen={scanResultOpen}
        onClose={closeScanResult}
        onScanNext={() => { setScanResultOpen(false); setScannedBarcode(undefined); setScannerOpen(true); }}
        scannedBarcode={scannedBarcode}
        isHoliday={!todayIsSchoolDay}
      />
    </div>
    </SkeletonWrapper>
  );
}
