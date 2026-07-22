"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  BookCheck,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { SkeletonTable } from "@/components/skeleton";
import Pagination from "@/components/shared/ui/Pagination";

const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTitle), { ssr: false });
const DialogTrigger = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTrigger), { ssr: false });

interface Subject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  teachers?: { name: string };
  subjects?: { name: string; code: string };
  classes?: { name: string };
}

interface Schedule {
  id: string;
  teacher_subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  created_at: string;
  teacher_subjects?: {
    teacher_id: string;
    subject_id: string;
    class_id: string;
    teachers?: { name: string };
    subjects?: { name: string; code: string };
    classes?: { name: string };
  };
}

interface Teacher {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-6 w-56 bg-muted animate-pulse rounded" />
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}

export default function PengaturanPresensiMapelPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "mapel";

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  const [selectedClass, setSelectedClass] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [formError, setFormError] = useState("");

  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [pengampuForm, setPengampuForm] = useState({ teacher_id: "", subject_ids: [] as string[], class_ids: [] as string[] });
  const [editingPengampu, setEditingPengampu] = useState<TeacherSubject | null>(null);

  const [jadwalForm, setJadwalForm] = useState({
    teacher_subject_id: "",
    day_of_week: "1",
    start_time: "",
    end_time: "",
    room: "",
  });
  const [editingJadwal, setEditingJadwal] = useState<Schedule | null>(null);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingJadwal, setImportingJadwal] = useState(false);
  const jadwalFileInputRef = useRef<HTMLInputElement>(null);

  const ROWS_PER_PAGE = 10;
  const [subjectPage, setSubjectPage] = useState(1);
  const [pengampuPage, setPengampuPage] = useState(1);
  const [jadwalPage, setJadwalPage] = useState(1);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [subjectsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("users").select("id, name").eq("role", "guru").order("name"),
        supabase.from("classes").select("id, name").order("name"),
      ]);
      setAllSubjects(subjectsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
      if (classesRes.data && classesRes.data.length > 0) {
        setSelectedClass(classesRes.data[0].id);
      }
      setLoading(false);
    }
    init();
  }, [supabase]);

  const fetchTeacherSubjects = useCallback(async () => {
    const { data } = await supabase
      .from("teacher_subjects")
      .select("*, teachers:teacher_id(name), subjects:subject_id(name, code), classes:class_id(name)")
      .order("created_at");
    setTeacherSubjects(data || []);
  }, [supabase]);

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase
      .from("schedules")
      .select("*, teacher_subjects:teacher_subject_id(*, teachers:teacher_id(name), subjects:subject_id(name, code), classes:class_id(name))")
      .order("start_time");
    setSchedules(data || []);
  }, [supabase]);

  useEffect(() => {
    if (tab === "pengampu") fetchTeacherSubjects();
    if (tab === "jadwal") { fetchTeacherSubjects(); fetchSchedules(); }
    setSubjectPage(1);
    setPengampuPage(1);
    setJadwalPage(1);
  }, [tab, fetchTeacherSubjects, fetchSchedules]);

  useEffect(() => {
    setPengampuPage(1);
  }, [selectedClass]);

  useEffect(() => {
    setJadwalPage(1);
  }, [selectedClass]);

  function switchTab(t: string) {
    router.push(`/admin/pengaturan-presensi-mapel?tab=${t}`);
  }

  function getDayName(d: number) {
    if (d < 1 || d > 5) return "-";
    return dayNames[d - 1];
  }

  function getPengampuLabel(ts: TeacherSubject) {
    const t = ts as any;
    const guru = t.teachers?.name || "(tanpa guru)";
    const mapel = t.subjects?.name || t.subject_id?.slice(0, 8) || "(tanpa mapel)";
    const kelas = t.classes?.name || t.class_id?.slice(0, 8) || "(tanpa kelas)";
    return `${mapel} - ${guru} - ${kelas}`;
  }

  async function handleSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      setFormError("Nama dan kode mapel wajib diisi");
      return;
    }
    if (editingSubject) {
      const { error } = await supabase
        .from("subjects")
        .update({ name: subjectForm.name.trim(), code: subjectForm.code.trim() })
        .eq("id", editingSubject.id);
      if (error) { setFormError(error.message); return; }
      toast.success("Mapel berhasil diperbarui");
    } else {
      const { error } = await supabase
        .from("subjects")
        .insert({ name: subjectForm.name.trim(), code: subjectForm.code.trim() });
      if (error) { setFormError(error.message); return; }
      toast.success("Mapel berhasil ditambahkan");
    }
    closeDialog();
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
    setAllSubjects(data || []);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingSubject(null);
    setEditingPengampu(null);
    setEditingJadwal(null);
    setSubjectForm({ name: "", code: "" });
    setPengampuForm({ teacher_id: "", subject_ids: [], class_ids: [] });
    setJadwalForm({ teacher_subject_id: "", day_of_week: "1", start_time: "", end_time: "", room: "" });
    setFormError("");
  }

  function openAddSubject() {
    setEditingSubject(null);
    setEditingPengampu(null);
    setEditingJadwal(null);
    setSubjectForm({ name: "", code: "" });
    setFormError("");
    setDialogTitle("Tambah Mapel");
    setDialogOpen(true);
  }

  function openEditSubject(s: Subject) {
    setEditingSubject(s);
    setSubjectForm({ name: s.name, code: s.code });
    setFormError("");
    setDialogTitle("Edit Mapel");
    setDialogOpen(true);
  }

  async function deleteSubject(id: string) {
    const name = subjects.find((s) => s.id === id)?.name || "";
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus mapel"); return; }
    toast.success(`Mapel "${name}" berhasil dihapus`);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setAllSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleImportSubjects(rows: Record<string, string>[]) {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const code = (row["Kode"] || row["kode"] || "").toString().trim();
      const name = (row["Nama Mapel"] || row["nama_mapel"] || row["Nama"] || row["nama"] || "").toString().trim();
      if (!code || !name) {
        errors.push(`Baris ${success + errors.length + 1}: Kode atau Nama Mapel kosong`);
        continue;
      }
      const { error } = await supabase.from("subjects").upsert(
        { code, name },
        { onConflict: "code", ignoreDuplicates: false }
      );
      if (error) {
        errors.push(`Baris ${success + errors.length + 1}: ${error.message}`);
      } else {
        success++;
      }
    }
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
    setAllSubjects(data || []);
    return { success, errors };
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Kode", "Nama Mapel"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_mapel.xlsx");
    toast.success("Template berhasil diunduh");
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length === 0) {
        toast.error("File Excel kosong");
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const result = await handleImportSubjects(json);
      if (result.errors.length === 0) {
        toast.success(`${result.success} data berhasil diimpor`);
      } else {
        toast.info(`${result.success} berhasil, ${result.errors.length} gagal`);
        result.errors.forEach((err) => toast.error(err));
      }
    } catch {
      toast.error("Gagal membaca file Excel");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePengampuSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!pengampuForm.teacher_id || pengampuForm.subject_ids.length === 0 || pengampuForm.class_ids.length === 0) {
      setFormError("Semua field wajib dipilih");
      return;
    }
    const { teacher_id, subject_ids, class_ids } = pengampuForm;
    if (editingPengampu) {
      const { error: delErr } = await supabase
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", teacher_id);
      if (delErr) { setFormError(delErr.message); return; }
    }
    for (const subjectId of subject_ids) {
      for (const classId of class_ids) {
        const { error } = await supabase
          .from("teacher_subjects")
          .insert({ teacher_id, subject_id: subjectId, class_id: classId });
        if (error) { setFormError(error.message); return; }
      }
    }
    toast.success(editingPengampu ? "Pengampu berhasil diperbarui" : "Pengampu berhasil ditambahkan");
    closeDialog();
    fetchTeacherSubjects();
  }

  function openAddPengampu() {
    setEditingPengampu(null);
    setEditingSubject(null);
    setEditingJadwal(null);
    setPengampuForm({ teacher_id: "", subject_ids: [], class_ids: [] });
    setFormError("");
    setDialogTitle("Tambah Guru Pengampu");
    setDialogOpen(true);
  }

  function openEditPengampu(teacherId: string) {
    const rows = teacherSubjects.filter((ts) => ts.teacher_id === teacherId);
    if (rows.length === 0) return;
    const subject_ids = [...new Set(rows.map((ts) => ts.subject_id))];
    const class_ids = [...new Set(rows.map((ts) => ts.class_id))];
    setEditingPengampu(rows[0]);
    setEditingSubject(null);
    setEditingJadwal(null);
    setPengampuForm({ teacher_id: teacherId, subject_ids, class_ids });
    setFormError("");
    setDialogTitle("Edit Guru Pengampu");
    setDialogOpen(true);
  }

  async function deletePengampu(teacherId: string) {
    const { error } = await supabase.from("teacher_subjects").delete().eq("teacher_id", teacherId);
    if (error) { toast.error("Gagal menghapus pengampu"); return; }
    toast.success("Semua data pengampu guru berhasil dihapus");
    fetchTeacherSubjects();
  }

  async function handleJadwalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!jadwalForm.teacher_subject_id || !jadwalForm.start_time || !jadwalForm.end_time) {
      setFormError("Semua field wajib diisi");
      return;
    }
    if (jadwalForm.start_time >= jadwalForm.end_time) {
      setFormError("Jam mulai harus lebih awal dari jam selesai");
      return;
    }
    const selectedTs = teacherSubjects.find((ts) => ts.id === jadwalForm.teacher_subject_id);
    if (!selectedTs) {
      setFormError("Pengampu tidak valid");
      return;
    }
    const dayOfWeek = parseInt(jadwalForm.day_of_week);
    const classId = selectedTs.class_id;
    const teacherId = selectedTs.teacher_id;
    const bentrokKelas = schedules.some((s) => {
      if (editingJadwal && s.id === editingJadwal.id) return false;
      return (
        s.teacher_subjects?.class_id === classId &&
        s.day_of_week === dayOfWeek &&
        s.start_time < jadwalForm.end_time &&
        s.end_time > jadwalForm.start_time
      );
    });
    if (bentrokKelas) {
      setFormError(`Sudah ada jadwal di kelas yang sama pada hari ${dayNames[dayOfWeek - 1]} di jam tersebut`);
      return;
    }
    const bentrokGuru = schedules.some((s) => {
      if (editingJadwal && s.id === editingJadwal.id) return false;
      return (
        s.teacher_subjects?.teacher_id === teacherId &&
        s.day_of_week === dayOfWeek &&
        s.start_time < jadwalForm.end_time &&
        s.end_time > jadwalForm.start_time
      );
    });
    if (bentrokGuru) {
      setFormError(`Guru tersebut sudah mengajar di jam yang sama pada hari ${dayNames[dayOfWeek - 1]}`);
      return;
    }
    const payload = {
      teacher_subject_id: jadwalForm.teacher_subject_id,
      day_of_week: dayOfWeek,
      start_time: jadwalForm.start_time,
      end_time: jadwalForm.end_time,
      room: jadwalForm.room || null,
    };
    if (editingJadwal) {
      const { error } = await supabase
        .from("schedules")
        .update(payload)
        .eq("id", editingJadwal.id);
      if (error) { setFormError(error.message); return; }
      toast.success("Jadwal berhasil diperbarui");
    } else {
      const { error } = await supabase
        .from("schedules")
        .insert(payload);
      if (error) { setFormError(error.message); return; }
      toast.success("Jadwal berhasil ditambahkan");
    }
    closeDialog();
    fetchSchedules();
  }

  function openAddJadwal() {
    setEditingJadwal(null);
    setEditingSubject(null);
    setEditingPengampu(null);
    setJadwalForm({ teacher_subject_id: "", day_of_week: "1", start_time: "", end_time: "", room: "" });
    setFormError("");
    setDialogTitle("Tambah Jadwal");
    setDialogOpen(true);
  }

  function openEditJadwal(s: Schedule) {
    setEditingJadwal(s);
    setEditingSubject(null);
    setEditingPengampu(null);
    setJadwalForm({
      teacher_subject_id: s.teacher_subject_id,
      day_of_week: String(s.day_of_week),
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room || "",
    });
    setFormError("");
    setDialogTitle("Edit Jadwal");
    setDialogOpen(true);
  }

  async function deleteJadwal(id: string) {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus jadwal"); return; }
    toast.success("Jadwal berhasil dihapus");
    fetchSchedules();
  }

  async function handleImportJadwal(rows: Record<string, string>[]) {
    let success = 0;
    const errors: string[] = [];
    const processed: { classId: string; teacherId: string; dayOfWeek: number; start: string; end: string }[] = [];
    for (const row of rows) {
      const kodeMapel = (row["Kode Mapel"] || "").toString().trim();
      const kodeGuru = (row["Nama Guru"] || "").toString().trim();
      const namaKelas = (row["Nama Kelas"] || "").toString().trim();
      const hari = (row["Hari"] || "").toString().trim();
      const jamMulai = (row["Jam Mulai"] || "").toString().trim();
      const jamSelesai = (row["Jam Selesai"] || "").toString().trim();
      const ruang = (row["Ruang"] || "").toString().trim();

      if (!kodeMapel || !kodeGuru || !namaKelas || !hari || !jamMulai || !jamSelesai) {
        errors.push(`Baris ${success + errors.length + 1}: Data tidak lengkap`);
        continue;
      }

      const dayMap: Record<string, number> = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5 };
      const dayOfWeek = dayMap[hari.toLowerCase()];
      if (!dayOfWeek) {
        errors.push(`Baris ${success + errors.length + 1}: Hari "${hari}" tidak valid`);
        continue;
      }

      const { data: subjData } = await supabase
        .from("subjects").select("id").eq("code", kodeMapel).maybeSingle();
      if (!subjData) {
        errors.push(`Baris ${success + errors.length + 1}: Mapel dengan kode "${kodeMapel}" tidak ditemukan`);
        continue;
      }

      const { data: userData } = await supabase
        .from("users").select("id").eq("name", kodeGuru).eq("role", "guru").maybeSingle();
      if (!userData) {
        errors.push(`Baris ${success + errors.length + 1}: Guru "${kodeGuru}" tidak ditemukan`);
        continue;
      }

      const { data: classData } = await supabase
        .from("classes").select("id").eq("name", namaKelas).maybeSingle();
      if (!classData) {
        errors.push(`Baris ${success + errors.length + 1}: Kelas "${namaKelas}" tidak ditemukan`);
        continue;
      }

      if (!jamMulai || !jamSelesai) {
        errors.push(`Baris ${success + errors.length + 1}: Jam mulai/selesai tidak valid`);
        continue;
      }
      if (jamMulai >= jamSelesai) {
        errors.push(`Baris ${success + errors.length + 1}: Jam mulai harus lebih awal dari jam selesai`);
        continue;
      }

      const isOverlap = (a: { start: string; end: string }, b: { start: string; end: string }) =>
        a.start < b.end && a.end > b.start;

      const bentrokKelas =
        schedules.some((s: any) => {
          if (editingJadwal && s.id === editingJadwal?.id) return false;
          return (
            s.teacher_subjects?.class_id === classData.id &&
            s.day_of_week === dayOfWeek &&
            isOverlap({ start: s.start_time, end: s.end_time }, { start: jamMulai, end: jamSelesai })
          );
        }) ||
        processed.some((p) =>
          p.classId === classData.id &&
          p.dayOfWeek === dayOfWeek &&
          isOverlap({ start: p.start, end: p.end }, { start: jamMulai, end: jamSelesai })
        );
      if (bentrokKelas) {
        errors.push(`Baris ${success + errors.length + 1}: Sudah ada jadwal di kelas yang sama pada hari tersebut di jam yang sama`);
        continue;
      }

      const bentrokGuru =
        schedules.some((s: any) => {
          if (editingJadwal && s.id === editingJadwal?.id) return false;
          return (
            s.teacher_subjects?.teacher_id === userData.id &&
            s.day_of_week === dayOfWeek &&
            isOverlap({ start: s.start_time, end: s.end_time }, { start: jamMulai, end: jamSelesai })
          );
        }) ||
        processed.some((p) =>
          p.teacherId === userData.id &&
          p.dayOfWeek === dayOfWeek &&
          isOverlap({ start: p.start, end: p.end }, { start: jamMulai, end: jamSelesai })
        );
      if (bentrokGuru) {
        errors.push(`Baris ${success + errors.length + 1}: Guru tersebut sudah mengajar di jam yang sama pada hari tersebut`);
        continue;
      }

      const { data: tsData } = await supabase
        .from("teacher_subjects")
        .select("id")
        .eq("teacher_id", userData.id)
        .eq("subject_id", subjData.id)
        .eq("class_id", classData.id)
        .maybeSingle();

      let tsId: string;
      if (tsData) {
        tsId = tsData.id;
      } else {
        const { data: newTs, error: tsErr } = await supabase
          .from("teacher_subjects")
          .insert({ teacher_id: userData.id, subject_id: subjData.id, class_id: classData.id })
          .select("id")
          .single();
        if (tsErr || !newTs) {
          errors.push(`Baris ${success + errors.length + 1}: Gagal membuat pengampu: ${tsErr?.message}`);
          continue;
        }
        tsId = newTs.id;
      }

      const { error } = await supabase.from("schedules").insert({
        teacher_subject_id: tsId,
        day_of_week: dayOfWeek,
        start_time: jamMulai,
        end_time: jamSelesai,
        room: ruang || null,
      });
      if (error) {
        errors.push(`Baris ${success + errors.length + 1}: ${error.message}`);
      } else {
        success++;
        processed.push({ classId: classData.id, teacherId: userData.id, dayOfWeek, start: jamMulai, end: jamSelesai });
      }
    }
    fetchSchedules();
    fetchTeacherSubjects();
    return { success, errors };
  }

  function downloadJadwalTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Kode Mapel", "Nama Guru", "Nama Kelas", "Hari", "Jam Mulai", "Jam Selesai", "Ruang"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_jadwal.xlsx");
    toast.success("Template jadwal berhasil diunduh");
  }

  async function handleJadwalImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingJadwal(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length === 0) {
        toast.error("File Excel kosong");
        setImportingJadwal(false);
        if (jadwalFileInputRef.current) jadwalFileInputRef.current.value = "";
        return;
      }
      const result = await handleImportJadwal(json);
      if (result.errors.length === 0) {
        toast.success(`${result.success} data jadwal berhasil diimpor`);
      } else {
        toast.info(`${result.success} berhasil, ${result.errors.length} gagal`);
        result.errors.forEach((err) => toast.error(err));
      }
    } catch {
      toast.error("Gagal membaca file Excel");
    }
    setImportingJadwal(false);
    if (jadwalFileInputRef.current) jadwalFileInputRef.current.value = "";
  }

  const filteredPengampu = selectedClass
    ? teacherSubjects.filter((ts: any) => ts.classes?.id === selectedClass || ts.class_id === selectedClass)
    : teacherSubjects;

  const filteredSchedules = selectedClass
    ? schedules.filter((s: any) => {
        const cls = s.teacher_subjects?.classes;
        return cls?.id === selectedClass || s.teacher_subjects?.class_id === selectedClass;
      })
    : schedules;

  const filteredPengampuOptions = selectedClass
    ? teacherSubjects.filter((ts: any) => ts.classes?.id === selectedClass || ts.class_id === selectedClass)
    : teacherSubjects;

  const groupedPengampu = Object.values(
    filteredPengampu.reduce((acc, ts: any) => {
      const key = ts.teacher_id;
      if (!acc[key]) {
        acc[key] = { teacher_id: key, teacher_name: ts.teachers?.name || "—", subjects: new Set(), classes: new Set() };
      }
      if (ts.subjects?.name) acc[key].subjects.add(ts.subjects.name);
      if (ts.classes?.name) acc[key].classes.add(ts.classes.name);
      return acc;
    }, {} as Record<string, { teacher_id: string; teacher_name: string; subjects: Set<string>; classes: Set<string> }>)
  );

  const paginatedSubjects = subjects.slice((subjectPage - 1) * ROWS_PER_PAGE, subjectPage * ROWS_PER_PAGE);
  const paginatedGroupedPengampu = groupedPengampu.slice((pengampuPage - 1) * ROWS_PER_PAGE, pengampuPage * ROWS_PER_PAGE);
  const paginatedSchedules = filteredSchedules.slice((jadwalPage - 1) * ROWS_PER_PAGE, jadwalPage * ROWS_PER_PAGE);

  return (
    <SkeletonWrapper loading={loading} skeleton={<PageSkeleton />}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <BookCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground">Pengaturan Presensi Mapel</h1>
            <p className="text-sm text-muted-foreground">Kelola mata pelajaran, guru pengampu, dan jadwal pelajaran</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="clay-card p-1.5 flex gap-1">
          {[
            { key: "mapel", label: "Mata Pelajaran", icon: BookOpen },
            { key: "pengampu", label: "Guru Pengampu", icon: Users },
            { key: "jadwal", label: "Jadwal Pelajaran", icon: Calendar },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center clay-transition cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.key === "mapel" ? "Mapel" : t.key === "pengampu" ? "Pengampu" : "Jadwal"}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: MAPEL */}
        {tab === "mapel" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Daftar Mata Pelajaran</h2>
              <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                <button
                  onClick={downloadTemplate}
                  className="clay-button px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Unduh Format
                </button>
                <label className="clay-button px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2 clay-transition">
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importing ? "Mengimpor..." : "Import Excel"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileChange}
                    disabled={importing}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={openAddSubject}
                  className="clay-button-accent px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Mapel
                </button>
              </div>
            </div>

            <div className="clay-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-16">No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Kode Mapel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama Mapel</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((s, i) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{(subjectPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold">{s.code}</td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditSubject(s)}
                              className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteSubject(s.id)}
                              className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada mata pelajaran</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={subjectPage}
                totalPages={Math.ceil(subjects.length / ROWS_PER_PAGE)}
                onPageChange={setSubjectPage}
                totalItems={subjects.length}
                label="mapel"
              />
            </div>
          </div>
        )}

        {/* TAB: PENGAMPU */}
        {tab === "pengampu" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Daftar Pengampu</h2>
              <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-foreground">Filter Kelas:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="clay-input px-3 py-2 text-sm rounded-xl outline-none cursor-pointer font-bold"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={openAddPengampu}
                  className="clay-button-accent px-4 py-2 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pengampu
                </button>
              </div>
            </div>

            <div className="clay-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-16">No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Guru</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Mapel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Kelas</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGroupedPengampu.map((group, i) => (
                      <tr key={group.teacher_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{(pengampuPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3 font-medium">{group.teacher_name}</td>
                        <td className="px-4 py-3">{Array.from(group.subjects).join(", ")}</td>
                        <td className="px-4 py-3">{Array.from(group.classes).join(", ")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditPengampu(group.teacher_id)}
                              className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deletePengampu(group.teacher_id)}
                              className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {groupedPengampu.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data pengampu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={pengampuPage}
                totalPages={Math.ceil(groupedPengampu.length / ROWS_PER_PAGE)}
                onPageChange={setPengampuPage}
                totalItems={groupedPengampu.length}
                label="pengampu"
              />
            </div>
          </div>
        )}

        {/* TAB: JADWAL */}
        {tab === "jadwal" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Daftar Jadwal</h2>
              <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                <button
                  onClick={downloadJadwalTemplate}
                  className="clay-button px-4 py-2 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Unduh Format
                </button>
                <label className="clay-button px-4 py-2 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2 clay-transition">
                  {importingJadwal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importingJadwal ? "Mengimpor..." : "Import Excel"}
                  <input
                    ref={jadwalFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleJadwalImportFileChange}
                    disabled={importingJadwal}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={openAddJadwal}
                  className="clay-button-accent px-4 py-2 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Jadwal
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-foreground">Filter Kelas:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="clay-input px-3 py-2 text-sm rounded-xl outline-none cursor-pointer font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="clay-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-16">No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Hari</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Mapel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Guru</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Jam Mulai</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Jam Selesai</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Ruang</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSchedules.map((s: any, i) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{(jadwalPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3 font-bold">{getDayName(s.day_of_week)}</td>
                        <td className="px-4 py-3">{s.teacher_subjects?.subjects?.name || "—"}</td>
                        <td className="px-4 py-3">{s.teacher_subjects?.teachers?.name || "—"}</td>
                        <td className="px-4 py-3 font-mono text-sm">{s.start_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3 font-mono text-sm">{s.end_time?.slice(0, 5)}</td>
                        <td className="px-4 py-3">{s.room || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditJadwal(s)}
                              className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteJadwal(s.id)}
                              className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredSchedules.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada jadwal</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={jadwalPage}
                totalPages={Math.ceil(filteredSchedules.length / ROWS_PER_PAGE)}
                onPageChange={setJadwalPage}
                totalItems={filteredSchedules.length}
                label="jadwal"
              />
            </div>
          </div>
        )}

        {/* DIALOGS */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent className="sm:max-w-[500px] clay-card border-0 p-0">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl font-bold">{dialogTitle}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={
                  editingSubject
                    ? handleSubjectSubmit
                    : editingPengampu
                      ? handlePengampuSubmit
                      : editingJadwal
                        ? handleJadwalSubmit
                        : dialogTitle.includes("Mapel")
                          ? handleSubjectSubmit
                          : dialogTitle.includes("Pengampu")
                            ? handlePengampuSubmit
                            : handleJadwalSubmit
                }
                className="space-y-4 mt-4"
              >
                {/* Subject Form */}
                {(editingSubject !== null || (dialogTitle.includes("Mapel") && !editingPengampu && !editingJadwal)) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Kode Mapel</label>
                      <input
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                        placeholder="Contoh: MTK-WAJIB"
                        className="clay-input w-full px-4 py-2.5 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Nama Mapel</label>
                      <input
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        placeholder="Contoh: Matematika Wajib"
                        className="clay-input w-full px-4 py-2.5 outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Pengampu Form */}
                {((editingPengampu !== null || dialogTitle.includes("Pengampu")) && !editingSubject) && !editingJadwal && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Pilih Guru</label>
                      <select
                        value={pengampuForm.teacher_id}
                        onChange={(e) => setPengampuForm({ ...pengampuForm, teacher_id: e.target.value })}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        <option value="">Pilih guru</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Pilih Mapel</label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-muted/30 border border-border/50">
                        {allSubjects.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <input
                              type="checkbox"
                              checked={pengampuForm.subject_ids.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPengampuForm({ ...pengampuForm, subject_ids: [...pengampuForm.subject_ids, s.id] });
                                } else {
                                  setPengampuForm({ ...pengampuForm, subject_ids: pengampuForm.subject_ids.filter(id => id !== s.id) });
                                }
                              }}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-medium">{s.name} ({s.code})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Pilih Kelas</label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-muted/30 border border-border/50">
                        {classes.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <input
                              type="checkbox"
                              checked={pengampuForm.class_ids.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPengampuForm({ ...pengampuForm, class_ids: [...pengampuForm.class_ids, c.id] });
                                } else {
                                  setPengampuForm({ ...pengampuForm, class_ids: pengampuForm.class_ids.filter(id => id !== c.id) });
                                }
                              }}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-medium">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Jadwal Form */}
                {((editingJadwal !== null || dialogTitle.includes("Jadwal")) && !editingSubject && !editingPengampu) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Pilih Kelas</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Pilih Guru Pengampu</label>
                      <select
                        value={jadwalForm.teacher_subject_id}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, teacher_subject_id: e.target.value })}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        <option value="">Pilih pengampu</option>
                        {filteredPengampuOptions.map((ts: any) => (
                          <option key={ts.id} value={ts.id}>
                            {ts.subjects?.name || "—"} - {ts.teachers?.name || "—"} - {ts.classes?.name || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Hari</label>
                      <select
                        value={jadwalForm.day_of_week}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, day_of_week: e.target.value })}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        {dayNames.map((d, i) => (
                          <option key={i + 1} value={String(i + 1)}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Jam Mulai</label>
                        <input
                          type="time"
                          value={jadwalForm.start_time}
                          onChange={(e) => setJadwalForm({ ...jadwalForm, start_time: e.target.value })}
                          className="clay-input w-full px-4 py-2.5 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Jam Selesai</label>
                        <input
                          type="time"
                          value={jadwalForm.end_time}
                          onChange={(e) => setJadwalForm({ ...jadwalForm, end_time: e.target.value })}
                          className="clay-input w-full px-4 py-2.5 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Ruang <span className="text-muted-foreground font-normal">(opsional)</span></label>
                      <input
                        value={jadwalForm.room}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, room: e.target.value })}
                        placeholder="Contoh: Ruang 3"
                        className="clay-input w-full px-4 py-2.5 outline-none"
                      />
                    </div>
                  </>
                )}

                {formError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive">
                    {formError}
                  </div>
                )}

                <button type="submit" className="clay-button w-full py-3 text-white font-bold rounded-xl cursor-pointer">
                  {editingSubject ? "Simpan Perubahan" : editingPengampu ? "Simpan Perubahan" : editingJadwal ? "Simpan Perubahan" : "Simpan"}
                </button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SkeletonWrapper>
  );
}
