"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateLocal } from "@/lib/helpers";
import { Plus, Pencil, Trash2, Search, GraduationCap, Download, Upload, FileBarChart, ChevronDown, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import dynamic from "next/dynamic";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Link from "next/link";

const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTitle), { ssr: false });
const DialogTrigger = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTrigger), { ssr: false });

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

interface Teacher { id: string; email: string; name: string; role: string; }

const TeacherRow = memo(function TeacherRow({ teacher, onEdit, onDelete }: { teacher: Teacher; onEdit: (t: Teacher) => void; onDelete: (id: string) => void; }) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
      <td className="px-4 py-3 font-medium">{teacher.name}</td>
      <td className="px-4 py-3">{teacher.email}</td>
      <td className="px-4 py-3 text-center">
        <span className={`clay-badge px-2 py-0.5 text-xs font-bold ${
          teacher.role === "admin" ? "bg-primary/10 text-primary border-2 border-primary/20"
          : teacher.role === "tenaga_kependidikan" ? "bg-yellow-100 text-yellow-600 border-2 border-yellow-200"
          : teacher.role === "siswa" ? "bg-muted text-muted-foreground border-2 border-border"
          : "bg-secondary/10 text-secondary border-2 border-secondary/20"
        }`}>
          {teacher.role === "admin" ? "Admin" : teacher.role === "tenaga_kependidikan" ? "Tenaga Kependidikan" : teacher.role === "siswa" ? "Siswa" : "Guru"}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex gap-1 justify-end">
          <button onClick={() => onEdit(teacher)} className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(teacher.id)} className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"><Trash2 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
});

function TeachersSkeleton() {
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
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}

export default function TeachersPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortField, setSortField] = useState<"name" | "email">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ email: "", name: "", role: "guru", password: "" });
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<{ email: string; name: string; role: string }[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => { fetchTeachers(); }, []);

  async function fetchTeachers() {
    setLoading(true);
    const { data } = await supabase.from("users").select("*").neq("role", "siswa").order("name");
    setTeachers(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (editingTeacher) {
      await supabase.from("users").update({ email: form.email, name: form.name, role: form.role }).eq("id", editingTeacher.id);
      if (form.password) {
        if (form.password.length < 6) { setFormError("Password minimal 6 karakter."); toast.error("Gagal menyimpan data."); return; }
        const res = await fetch("/api/admin/update-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: editingTeacher.id, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error); toast.error("Gagal menyimpan data."); return; }
      }
    } else {
      if (!form.password) { setFormError("Password wajib diisi."); toast.error("Gagal menyimpan data."); return; }
      if (form.password.length < 6) { setFormError("Password minimal 6 karakter."); toast.error("Gagal menyimpan data."); return; }
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); toast.error("Gagal menyimpan data."); return; }
      await supabase.from("users").insert({ id: data.userId, email: form.email, name: form.name, role: form.role });
    }
    const wasEditing = !!editingTeacher;
    setDialogOpen(false); setEditingTeacher(null); setForm({ email: "", name: "", role: "guru", password: "" }); fetchTeachers();
    toast.success(wasEditing ? "Data berhasil diperbarui." : "Data baru berhasil ditambahkan.");
  }

  const handleDelete = useCallback(async (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    toast("Data berhasil dihapus.", {
      action: { label: "Urungkan", onClick: () => fetchTeachers() },
      duration: 8000,
    });
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) { toast.error("Gagal menghapus data."); fetchTeachers(); }
  }, []);

  function openEdit(teacher: Teacher) { setEditingTeacher(teacher); setForm({ email: teacher.email, name: teacher.name, role: teacher.role, password: "" }); setFormError(""); setDialogOpen(true); }
  function openAdd() { setEditingTeacher(null); setForm({ email: "", name: "", role: "guru", password: "" }); setFormError(""); setDialogOpen(true); }

  async function handleExport() {
    setExporting(true);
    try {
      const { data: users } = await supabase.from("users").select("email, name, role").order("name");
      if (!users) { toast.error("Gagal mengambil data."); return; }

      const rows = users.map((u: { email: string; name: string; role: string }, i: number) => ({
        No: i + 1,
        Email: u.email,
        Nama: u.name,
        Role: u.role === "admin" ? "Admin" : u.role === "tenaga_kependidikan" ? "Tenaga Kependidikan" : "Guru",
        "Password Default": u.role === "guru" ? `Guru${String(i + 1).padStart(3, "0")}` : u.role === "tenaga_kependidikan" ? `TK${String(i + 1).padStart(3, "0")}` : "-",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Data Guru dan TK");
      XLSX.writeFile(wb, `data-guru-${formatDateLocal()}.xlsx`);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor file.");
    }
    setExporting(false);
  }

  function handleDownloadTemplate() {
    setImportMenuOpen(false);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { Email: "guru@guru.com", Nama: "Nama Guru", Role: "guru" },
    ]);
      XLSX.utils.book_append_sheet(wb, ws, "Template Import");
    XLSX.writeFile(wb, "template-import-guru.xlsx");
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
      const jsonData = XLSX.utils.sheet_to_json<{ Email: string; Nama: string; Role: string }>(ws);

      const parsed = jsonData.map((row) => ({
        email: String(row.Email || ""),
        name: String(row.Nama || ""),
        role: String(row.Role || "guru").toLowerCase() === "admin" ? "admin" : String(row.Role || "").toLowerCase() === "tenaga_kependidikan" ? "tenaga_kependidikan" : "guru",
      })).filter((r) => r.email && r.name);

      setImportData(parsed);
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImportSubmit() {
    if (importData.length === 0) { toast.error("Tidak ada data untuk diimport."); return; }
    setImporting(true);

    try {
      const users = importData.map((row, i) => ({
        email: row.email,
        password: row.role === "admin" ? `Admin${String(i + 1).padStart(3, "0")}` : row.role === "tenaga_kependidikan" ? `TK${String(i + 1).padStart(3, "0")}` : `Guru${String(i + 1).padStart(3, "0")}`,
        name: row.name,
        role: row.role,
      }));

      const res = await fetch("/api/admin/import-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users }),
      });
      const result = await res.json();

      if (result.succeeded > 0) {
        toast.success(`${result.succeeded} data berhasil diimport.`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} data gagal diimport.`);
      }

      setImportDialogOpen(false);
      setImportData([]);
      setImportFile(null);
      fetchTeachers();
    } catch {
      toast.error("Gagal melakukan import.");
    }
    setImporting(false);
  }

  function toggleSort(field: "name" | "email") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const result = teachers.filter((t) => t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || t.email.toLowerCase().includes(debouncedSearch.toLowerCase()));
    result.sort((a, b) => {
      const cmp = sortField === "name" ? a.name.localeCompare(b.name) : a.email.localeCompare(b.email);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [teachers, debouncedSearch, sortField, sortDir]);

  return (
    <SkeletonWrapper loading={loading} skeleton={<TeachersSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl"><GraduationCap className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Data Guru dan Tenaga Kependidikan</h1>
            <p className="text-sm text-muted-foreground">Kelola data guru dan tenaga kependidikan</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
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
            <button onClick={handleExport} disabled={exporting} className="clay-button px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
            </button>
            <Link href="/admin/presensi-guru" className="clay-button px-4 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2">
              <FileBarChart className="h-4 w-4" /> Rekap
            </Link>
            <button onClick={openAdd} className="clay-button-accent px-4 py-2.5 text-black text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer">
              <Plus className="h-4 w-4" /> Tambah
            </button>
          </div>
        </div>
      </div>

      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border/50">
              {(["name", "email"] as const).map((field) => {
                const active = sortField === field;
                const label = field === "name" ? "Nama" : "Email";
                return (
                  <th key={field} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">
                    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
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
              <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center">Role</th>
              <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center">Aksi</th>
            </tr></thead>
            <tbody>
              {filtered.map((teacher) => (<TeacherRow key={teacher.id} teacher={teacher} onEdit={openEdit} onDelete={handleDelete} />))}
              {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Tambah/Edit Guru */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Data" : "Tambah Data"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingTeacher} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium">Nama</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" required />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none">
                <option value="guru">Guru</option>
                <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Password {editingTeacher ? <span className="text-xs text-muted-foreground">(kosongkan jika tidak diubah)</span> : ""}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="clay-input w-full px-3 py-2 text-sm rounded-xl outline-none" placeholder={editingTeacher ? "Biarkan kosong" : "Minimal 6 karakter"} required={!editingTeacher} />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl border cursor-pointer">Batal</button>
              <button type="submit" className="clay-button px-4 py-2 text-sm font-bold rounded-xl text-white cursor-pointer">{editingTeacher ? "Simpan" : "Tambah"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="clay-card p-6 w-full max-w-lg mx-4">
            <h2 className="font-heading text-xl font-bold mb-4">Import Data</h2>
            {!importFile ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">Pilih file Excel (.xlsx)</p>
                <input type="file" accept=".xlsx,.xls" onChange={handleImportFileSelect} className="hidden" id="import-guru-input" />
                <label htmlFor="import-guru-input" className="clay-button px-4 py-2 text-sm font-bold rounded-xl cursor-pointer inline-block">
                  Pilih File
                </label>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2"><strong>File:</strong> {importFile.name}</p>
                <p className="text-sm mb-4"><strong>Jumlah data:</strong> {importData.length} data</p>
                <div className="max-h-[200px] overflow-y-auto border rounded-xl mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-left">Password</th></tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 capitalize">{row.role}</td>
                           <td className="px-3 py-2 font-mono text-xs">{row.role === "admin" ? `Admin${String(i + 1).padStart(3, "0")}` : row.role === "tenaga_kependidikan" ? `TK${String(i + 1).padStart(3, "0")}` : `Guru${String(i + 1).padStart(3, "0")}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importData.length > 20 && <p className="text-xs text-muted-foreground mb-3">...dan {importData.length - 20} data lainnya</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setImportDialogOpen(false); setImportData([]); setImportFile(null); }} className="px-4 py-2 text-sm font-medium rounded-xl border cursor-pointer">Batal</button>
                  <button onClick={handleImportSubmit} disabled={importing} className="clay-button px-4 py-2 text-sm font-bold rounded-xl text-white cursor-pointer flex items-center gap-2">
                    {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengimport...</> : `Import ${importData.length} Data`}
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
