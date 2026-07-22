"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react";
import dynamic from "next/dynamic";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonTable } from "@/components/skeleton";
import { toast } from "sonner";

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

interface Class {
  id: string;
  name: string;
  grade_level: number;
  wali_kelas_id: string | null;
  major_id: string;
  majors?: { name: string };
  users?: { name: string };
}

interface Major {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
}

const KelasRow = memo(function KelasRow({
  cls,
  teachers,
  onEdit,
  onDelete,
}: {
  cls: Class;
  teachers: Teacher[];
  onEdit: (c: Class) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150">
      <td className="px-4 py-3 font-medium">{cls.name}</td>
      <td className="px-4 py-3 hidden md:table-cell">{cls.majors?.name || "-"}</td>
      <td className="px-4 py-3">{cls.grade_level}</td>
      <td className="px-4 py-3">
        {cls.users?.name ? (
          <span className="clay-badge px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary border-2 border-primary/20">{cls.users.name}</span>
        ) : (
          <span className="clay-badge px-2 py-0.5 text-xs bg-muted text-muted-foreground border-2 border-border">Belum ditugaskan</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => onEdit(cls)}
            className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(cls.id)}
            className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function KelasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}

export default function KelasManagePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    major_id: "",
    grade_level: "10",
    wali_kelas_id: "",
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [classRes, majorRes, teacherRes] = await Promise.all([
      supabase.from("classes").select("*, majors(name), users(name)").order("name"),
      supabase.from("majors").select("id, name").order("name"),
      supabase.from("users").select("id, name").eq("role", "guru").order("name"),
    ]);
    setClasses(classRes.data || []);
    setMajors(majorRes.data || []);
    setTeachers(teacherRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) { setFormError("Nama kelas wajib diisi."); return; }
    if (!form.major_id) { setFormError("Jurusan wajib dipilih."); return; }

    const payload = {
      name: form.name.trim(),
      major_id: form.major_id,
      grade_level: parseInt(form.grade_level),
      wali_kelas_id: form.wali_kelas_id || null,
    };

    if (editingClass) {
      const { error } = await supabase.from("classes").update(payload).eq("id", editingClass.id);
      if (error) { setFormError(error.message); toast.error("Gagal menyimpan kelas."); return; }
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) { setFormError(error.message); toast.error("Gagal menyimpan kelas."); return; }
    }

    const wasEditing = !!editingClass;
    setDialogOpen(false);
    setEditingClass(null);
    setForm({ name: "", major_id: "", grade_level: "10", wali_kelas_id: "" });
    fetchData();
    toast.success(wasEditing ? "Kelas berhasil diperbarui." : "Kelas baru berhasil ditambahkan.");
  }

  const handleDelete = useCallback(async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    toast("Kelas berhasil dihapus.", {
      action: { label: "Urungkan", onClick: () => fetchData() },
      duration: 8000,
    });
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus kelas."); fetchData(); }
  }, [supabase]);

  function openEdit(cls: Class) {
    setEditingClass(cls);
    setFormError("");
    setForm({
      name: cls.name,
      major_id: cls.major_id,
      grade_level: String(cls.grade_level),
      wali_kelas_id: cls.wali_kelas_id || "",
    });
    setDialogOpen(true);
  }

  function openAdd() {
    setEditingClass(null);
    setFormError("");
    setForm({ name: "", major_id: "", grade_level: "10", wali_kelas_id: "" });
    setDialogOpen(true);
  }

  const filtered = useMemo(
    () => classes.filter((c) =>
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.majors?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.users?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [classes, debouncedSearch]
  );

  return (
    <SkeletonWrapper loading={loading} skeleton={<KelasSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Manajemen Kelas</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} kelas terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cari nama/jurusan/wali..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="clay-input pl-9 pr-4 py-2.5 w-full sm:w-64 outline-none"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <button
                  onClick={openAdd}
                  className="clay-button px-4 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Tambah
                </button>
              }
            />
            <DialogContent className="sm:max-w-[600px] clay-card border-0 p-0">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl font-bold">
                    {editingClass ? "Edit Kelas" : "Tambah Kelas"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Nama Kelas</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: X AKL 1"
                      className="clay-input w-full px-4 py-2.5 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Jurusan</label>
                      <select
                        value={form.major_id}
                        onChange={(e) => setForm({ ...form, major_id: e.target.value })}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        <option value="" disabled>Pilih jurusan</option>
                        {majors.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Tingkat</label>
                      <select
                        value={form.grade_level}
                        onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                        className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                      >
                        <option value="10">X (Kelas 10)</option>
                        <option value="11">XI (Kelas 11)</option>
                        <option value="12">XII (Kelas 12)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Wali Kelas <span className="text-muted-foreground font-normal">(opsional)</span></label>
                    <select
                      value={form.wali_kelas_id}
                      onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })}
                      className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer"
                    >
                      <option value="">Belum ditugaskan</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  {formError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive">
                      {formError}
                    </div>
                  )}
                  <button type="submit" className="clay-button w-full py-3 text-white font-bold rounded-xl cursor-pointer">
                    {editingClass ? "Simpan Perubahan" : "Tambah Kelas"}
                  </button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Nama Kelas</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase hidden md:table-cell">Jurusan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Tingkat</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Wali Kelas</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls) => (
                <KelasRow key={cls.id} cls={cls} teachers={teachers} onEdit={openEdit} onDelete={handleDelete} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data kelas ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </SkeletonWrapper>
  );
}
