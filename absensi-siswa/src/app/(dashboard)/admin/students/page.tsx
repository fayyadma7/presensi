"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateLocal } from "@/lib/helpers";
import { Plus, Pencil, Trash2, Search, Users, Download, Upload, FileBarChart, ChevronDown, Loader2, QrCode, FileCode, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import dynamic from "next/dynamic";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { generateBarcodeDataURL } from "@/lib/barcode";

/* ============================================================
   Dynamic imports – lazy load modal & select
   ============================================================ */
const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTitle), { ssr: false });
const DialogTrigger = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTrigger), { ssr: false });

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface Student {
  id: string;
  nis: string;
  name: string;
  class_id: string;
  email: string | null;
  status: string;
  classes?: { name: string; majors?: { name: string } };
}

interface Class {
  id: string;
  name: string;
  majors?: { name: string };
}

/* ============================================================
   StudentRow – memoized claymorphism row
   ============================================================ */
const StudentRow = memo(function StudentRow({
  student,
  onEdit,
  onDelete,
}: {
  student: Student;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
      <td className="px-4 py-3 font-mono text-sm text-center">{student.nis}</td>
      <td className="px-4 py-3 font-medium">{student.name}</td>
      <td className="px-4 py-3 whitespace-nowrap text-center">{student.classes?.name}</td>
      <td className="px-4 py-3 text-center hidden md:table-cell">{student.classes?.majors?.name}</td>
      <td className="px-4 py-3 text-center">
        <span className={`clay-badge px-2 py-0.5 text-xs font-bold ${
          student.status === "active" 
            ? "bg-success/10 text-success border-2 border-success/20" 
            : "bg-muted text-muted-foreground border-2 border-border"
        }`}>
          {student.status === "active" ? "Aktif" : "Non-aktif"}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => onEdit(student)}
            className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function StudentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div>
            <Skeleton className="h-8 w-36 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}

export default function StudentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    nis: "",
    name: "",
    class_id: "",
    email: "",
    password: "",
  });

  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<{ nis: string; name: string; className: string }[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"nis" | "name" | "class">("nis");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ITEMS_PER_PAGE = 20;

  useEffect(() => { fetchData(); }, []);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from("students").select("*, classes(name, majors(name))").order("nis"),
      supabase.from("classes").select("*, majors(name)").order("name"),
    ]);
    setStudents(studentsRes.data || []);
    setClasses(classesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (editingStudent) {
      const { error: updateError } = await supabase.from("students").update({
        nis: form.nis, name: form.name, class_id: form.class_id,
        email: form.email,
      }).eq("id", editingStudent.id);
      if (updateError) { setFormError(updateError.message); toast.error("Gagal menyimpan data siswa."); return; }
      if (form.password) {
        if (form.password.length < 6) { setFormError("Password minimal 6 karakter."); toast.error("Gagal menyimpan data siswa."); return; }
        const res = await fetch("/api/admin/update-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: editingStudent.id, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error); toast.error("Gagal menyimpan data siswa."); return; }
      }
    } else {
      if (!form.password) { setFormError("Password wajib diisi."); toast.error("Gagal menyimpan data siswa."); return; }
      if (form.password.length < 6) { setFormError("Password minimal 6 karakter."); toast.error("Gagal menyimpan data siswa."); return; }
      const email = form.email || `${form.nis}@siswa.smk3.sch.id`;
      const password = form.password || "Siswa123!";
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: form.name, role: "siswa" }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); toast.error("Gagal menyimpan data siswa."); return; }
      const userId = data.userId;
      const { error: studentError } = await supabase.from("students").insert({
        id: userId, nis: form.nis, name: form.name, class_id: form.class_id, email,
      });
      if (studentError) { setFormError(studentError.message); toast.error("Gagal menyimpan data siswa."); return; }
      await supabase.from("users").insert({
        id: userId, email, name: form.name, role: "siswa",
      });
    }
    const wasEditing = !!editingStudent;
    setDialogOpen(false);
    setEditingStudent(null);
    setForm({ nis: "", name: "", class_id: "", email: "", password: "" });
    fetchData();
    toast.success(wasEditing ? "Siswa berhasil diperbarui." : "Siswa baru berhasil ditambahkan.");
  }

  const handleDelete = useCallback(async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    toast("Siswa berhasil dihapus.", {
      action: { label: "Urungkan", onClick: () => fetchData() },
      duration: 8000,
    });
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) { toast.error("Gagal menghapus siswa."); fetchData(); }
  }, []);

  function openEdit(student: Student) {
    setEditingStudent(student);
    setFormError("");
    setForm({ nis: student.nis, name: student.name, class_id: student.class_id, email: student.email || "", password: "" });
    setDialogOpen(true);
  }

  function openAdd() {
    setEditingStudent(null);
    setFormError("");
    setForm({ nis: "", name: "", class_id: "", email: "", password: "" });
    setDialogOpen(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data: students } = await supabase
        .from("students")
        .select("nis, name, email, status, classes(name)")
        .order("nis");

      if (!students) { toast.error("Gagal mengambil data siswa."); return; }

      const { data: classesData } = await supabase.from("classes").select("id, name");
      const classMap: Record<string, string> = {};
      classesData?.forEach((c: { id: string; name: string }) => { classMap[c.id] = c.name; });

      const rows = students.map((s: { nis: string; name: string; email: string | null; status: string; classes?: { name: string } | null; class_id?: string }, i: number) => {
        let className = s.classes?.name || "";
        return {
          No: i + 1,
          NIS: s.nis,
          Nama: s.name,
          Kelas: className,
          Email: s.email || "",
          Status: s.status === "active" ? "Aktif" : "Tidak Aktif",
          "Password Default": s.nis.length >= 6 ? s.nis : s.nis.padStart(6, "0"),
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
      XLSX.writeFile(wb, `data-siswa-${formatDateLocal()}.xlsx`);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file.");
    }
    setExporting(false);
  }

  // Export Barcode PDF (ZIP)
  async function handleExportBarcode() {
    setExporting(true);
    try {
      const { data: students } = await supabase
        .from("students")
        .select("nis, name, class_id, classes(name)")
        .eq("status", "active")
        .order("nis");

      if (!students || students.length === 0) {
        toast.error("Tidak ada data siswa untuk dicetak.");
        return;
      }

      const zip = new JSZip();
      const dateStr = formatDateLocal();

      for (const student of students) {
        const className = Array.isArray(student.classes) ? student.classes[0]?.name || "" : (student.classes as any)?.name || "";
        const nis = student.nis;
        const name = student.name;

        // Generate barcode image
        const barcodeDataUrl = await generateBarcodeDataURL(nis);

        // Create PDF (A6 size: 105mm x 148mm)
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [105, 148],
        });

        // Add barcode centered
        const barcodeWidth = 80;
        const barcodeHeight = 30;
        const x = (105 - barcodeWidth) / 2;
        const y = 35;

        pdf.addImage(barcodeDataUrl, "PNG", x, y, barcodeWidth, barcodeHeight);

        // Add info below barcode
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(name, 105 / 2, y + barcodeHeight + 10, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(`NIS: ${nis}`, 105 / 2, y + barcodeHeight + 16, { align: "center" });
        if (className) {
          pdf.text(`Kelas: ${className}`, 105 / 2, y + barcodeHeight + 22, { align: "center" });
        }

        // Add filename to zip
        zip.file(`${nis}_${name.replace(/\s+/g, "_")}.pdf`, pdf.output("blob"));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `barcode-siswa-${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("File barcode ZIP berhasil diunduh!");
    } catch (e) {
      console.error("Barcode export error:", e);
      toast.error("Gagal mengekspor barcode.");
    }
    setExporting(false);
  }

  function handleDownloadTemplate() {
    setImportMenuOpen(false);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { NIS: "123456", Nama: "Nama Siswa", Kelas: "X AKL 1" },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Template Import Siswa");
    XLSX.writeFile(wb, "template-import-siswa.xlsx");
    toast.success("Template berhasil diunduh!");
  }

  function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<{ NIS: string; Nama: string; Kelas: string }>(ws);

      const parsed = jsonData.map((row) => ({
        nis: String(row.NIS || ""),
        name: String(row.Nama || ""),
        className: String(row.Kelas || ""),
      })).filter((r) => r.nis && r.name);

      setImportData(parsed);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImportSubmit() {
    if (importData.length === 0) { toast.error("Tidak ada data untuk diimport."); return; }
    setImporting(true);

    try {
      const { data: classesData } = await supabase.from("classes").select("id, name");
      const classMap: Record<string, string> = {};
      classesData?.forEach((c: { id: string; name: string }) => { classMap[c.name] = c.id; });

      const users = importData.map((row) => {
        const classId = classMap[row.className] || null;
        const paddedNis = row.nis.length >= 6 ? row.nis : row.nis.padStart(6, "0");
        return {
          email: `${row.nis}@siswa.smk3.sch.id`,
          password: paddedNis,
          name: row.name,
          role: "siswa",
          nis: row.nis,
          class_id: classId,
        };
      });

      const res = await fetch("/api/admin/import-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users }),
      });
      const result = await res.json();

      if (result.succeeded > 0) {
        toast.success(`${result.succeeded} siswa berhasil diimport.`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} siswa gagal diimport.`);
      }

      setImportDialogOpen(false);
      setImportData([]);
      setImportFile(null);
      fetchData();
    } catch {
      toast.error("Gagal melakukan import.");
    }
    setImporting(false);
  }

  function toggleSort(field: "nis" | "name" | "class") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const filtered = useMemo(() => {
    const result = students.filter((s) =>
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.nis.includes(debouncedSearch) ||
      s.classes?.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "nis") cmp = a.nis.localeCompare(b.nis);
      else if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "class") cmp = (a.classes?.name || "").localeCompare(b.classes?.name || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [students, debouncedSearch, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(
    () => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage]
  );

  return (
    <SkeletonWrapper loading={loading} skeleton={<StudentsSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl"><Users className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Data Siswa</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} siswa terdaftar</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa..."
              className="clay-input pl-10 pr-4 py-2 text-sm rounded-xl outline-none w-full sm:w-48"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative">
              <button
                onClick={() => setImportMenuOpen(!importMenuOpen)}
                className="clay-button px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" /> Import <ChevronDown className="h-3 w-3" />
              </button>
              {importMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setImportMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[180px]">
                    <button onClick={handleDownloadTemplate} className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 cursor-pointer">
                      <Download className="h-4 w-4" /> Unduh Format
                    </button>
                    <button onClick={() => { setImportMenuOpen(false); setImportDialogOpen(true); }} className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" /> Upload Data
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleExportBarcode} disabled={exporting} className="clay-button px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Barcode
            </button>
            <Link href="/admin/presensi-siswa" className="clay-button px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2">
              <FileBarChart className="h-4 w-4" /> Rekap
            </Link>
            <button onClick={openAdd} className="clay-button-accent px-4 py-2.5 text-black text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4" /> Tambah
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {(["nis", "name", "class"] as const).map((field) => {
                  const active = sortField === field;
                  const label = field === "nis" ? "NIS" : field === "name" ? "Nama" : "Kelas";
                  const align = field === "name" ? "text-left" : "text-center";
                  return (
                    <th key={field} className={"px-4 py-3 text-xs font-bold text-muted-foreground " + align}>
                      <button onClick={() => toggleSort(field)} className={"flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer " + (field === "name" ? "justify-start" : "justify-center w-full")}>
                        {label}
                        {active ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center hidden md:table-cell">Jurusan</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => (
                <StudentRow key={student.id} student={student} onEdit={openEdit} onDelete={handleDelete} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data siswa ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border/50 bg-muted/20 rounded-b-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm text-muted-foreground shrink-0">
                Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} siswa
              </span>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center shrink-0">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          currentPage === p
                            ? "bg-primary text-white border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Tambah/Edit Siswa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">NIS</label>
              <input value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} disabled={!!editingStudent} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium">Nama</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium">Kelas</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none">
                <option value="">Pilih kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.majors?.name || ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Email <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" placeholder="user@contoh.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Password {editingStudent ? <span className="text-xs text-muted-foreground">(kosongkan jika tidak diubah)</span> : ""}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" placeholder={editingStudent ? "Biarkan kosong" : "Minimal 6 karakter"} required={!editingStudent} />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl border cursor-pointer">Batal</button>
              <button type="submit" className="clay-button px-4 py-2 text-sm font-bold rounded-xl text-white cursor-pointer">{editingStudent ? "Simpan" : "Tambah"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="clay-card p-6 w-full max-w-lg mx-4">
            <h2 className="font-heading text-xl font-bold mb-4">Import Data Siswa</h2>
            {!importFile ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">Pilih file Excel (.xlsx)</p>
                <input type="file" accept=".xlsx,.xls" onChange={handleImportFileSelect} className="hidden" id="import-input" />
                <label htmlFor="import-input" className="clay-button px-4 py-2 text-sm font-bold rounded-xl cursor-pointer inline-block">
                  Pilih File
                </label>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2"><strong>File:</strong> {importFile.name}</p>
                <p className="text-sm mb-4"><strong>Jumlah data:</strong> {importData.length} siswa</p>
                <div className="max-h-[200px] overflow-y-auto border rounded-xl mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr><th className="px-3 py-2 text-left">NIS</th><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-left">Kelas</th><th className="px-3 py-2 text-left">Password</th></tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-2">{row.nis}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.className}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.nis.length >= 6 ? row.nis : row.nis.padStart(6, "0")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importData.length > 20 && <p className="text-xs text-muted-foreground mb-3">...dan {importData.length - 20} data lainnya</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setImportDialogOpen(false); setImportData([]); setImportFile(null); }} className="px-4 py-2 text-sm font-medium rounded-xl border cursor-pointer">Batal</button>
                  <button onClick={handleImportSubmit} disabled={importing} className="clay-button px-4 py-2 text-sm font-bold rounded-xl text-white cursor-pointer flex items-center gap-2">
                    {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengimport...</> : `Import ${importData.length} Siswa`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </SkeletonWrapper>
  );
}
