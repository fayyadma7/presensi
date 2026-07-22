"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDateLocal } from "@/lib/helpers";
import { Save, Loader2, School, Clock, MapPin, Users, Settings, Plus, Pencil, Trash2, CalendarOff, Navigation, BookOpen } from "lucide-react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonCard } from "@/components/skeleton";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTitle), { ssr: false });
const DialogTrigger = dynamic(() => import("@/components/ui/dialog").then((m) => m.DialogTrigger), { ssr: false });

interface SettingsData {
  school_name: string;
  morning_start: string;
  late_threshold: string;
  afternoon_start: string;
  afternoon_end: string;
  geofence_radius: string;
  school_lat: string;
  school_lng: string;
  auto_late: string;
}

interface ClassItem { id: string; name: string; grade_level: number; major_id: string; wali_kelas_id: string | null; majors?: { name: string }; users?: { name: string }; }
interface Major { id: string; name: string; }
interface Teacher { id: string; name: string; }

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div>
            <Skeleton className="h-8 w-36 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <div className="clay-card p-6 lg:col-span-2">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <SkeletonCard />
        <div className="clay-card p-6 lg:col-span-2">
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsData>({
    school_name: "", morning_start: "06:30", late_threshold: "07:00",
    afternoon_start: "14:00", afternoon_end: "15:30", geofence_radius: "100",
    school_lat: "-7.4212", school_lng: "109.4418", auto_late: "true",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [savingClassId, setSavingClassId] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<{ id: string; date: string; name: string; source: string }[]>([]);
  const [newHolidayStart, setNewHolidayStart] = useState("");
  const [newHolidayEnd, setNewHolidayEnd] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [holidayError, setHolidayError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", major_id: "", grade_level: "10", wali_kelas_id: "" });

  useEffect(() => { fetchSettings(); fetchWaliData(); fetchHolidays(); }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from("settings").select("key, value");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));
      setSettings((prev) => ({ ...prev, ...map }));
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("settings").upsert(updates, { onConflict: "key" });
    if (error) { toast.error("Gagal menyimpan pengaturan."); }
    else { setSaved(true); toast.success("Pengaturan berhasil disimpan!"); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  function updateSetting(key: keyof SettingsData, value: string) { setSettings((prev) => ({ ...prev, [key]: value })); }

  async function fetchWaliData() {
    const [classRes, majorRes, teacherRes] = await Promise.all([
      supabase.from("classes").select("*, majors(name), users(name)").order("name"),
      supabase.from("majors").select("id, name").order("name"),
      supabase.from("users").select("id, name").eq("role", "guru").order("name"),
    ]);
    setClasses(classRes.data || []);
    setMajors(majorRes.data || []);
    setTeachers(teacherRes.data || []);
  }

  async function assignWali(classId: string, teacherId: string) {
    setSavingClassId(classId);
    const { error } = await supabase.from("classes").update({ wali_kelas_id: teacherId || null }).eq("id", classId);
    if (error) { toast.error("Gagal menugaskan wali kelas."); }
    else { toast.success("Wali kelas berhasil ditugaskan."); }
    await fetchWaliData();
    setSavingClassId(null);
  }

  async function handleSubmitClass(e: React.FormEvent) {
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
      if (error) { setFormError(error.message); return; }
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) { setFormError(error.message); return; }
    }

    setDialogOpen(false);
    setEditingClass(null);
    setForm({ name: "", major_id: "", grade_level: "10", wali_kelas_id: "" });
    toast.success(editingClass ? "Kelas berhasil diperbarui." : "Kelas baru berhasil ditambahkan.");
    fetchWaliData();
  }

  const handleDeleteClass = useCallback(async (id: string) => {
    const className = classes.find(c => c.id === id)?.name || "Kelas";
    setClasses(prev => prev.filter(c => c.id !== id));
    toast(`"${className}" berhasil dihapus.`, {
      action: { label: "Urungkan", onClick: () => { fetchWaliData(); } },
      duration: 8000,
    });
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus kelas."); fetchWaliData(); }
  }, [supabase, classes]);

  async function fetchHolidays() {
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`/api/admin/sync-holidays?year=${year}`);
      const json = await res.json();
      setHolidays(json.holidays || []);
    } catch (err) {
      console.error("[Holidays] Error:", err);
      setHolidays([]);
    }
  }

  async function addHoliday() {
    setHolidayError("");
    if (!newHolidayStart || !newHolidayName) { setHolidayError("Tanggal mulai dan nama wajib diisi"); return; }
    const endDate = newHolidayEnd || newHolidayStart;
    if (endDate < newHolidayStart) { setHolidayError("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }

    const dates: string[] = [];
    const current = new Date(newHolidayStart + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (current <= end) {
      dates.push(formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }

    const toInsert = dates.map((date) => ({ date, name: newHolidayName, source: "manual" }));
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidays: toInsert }),
    });
    const json = await res.json();
    if (!res.ok) { setHolidayError(json.error || "Gagal menyimpan"); toast.error(json.error || "Gagal menyimpan hari libur."); return; }

    setNewHolidayStart(""); setNewHolidayEnd(""); setNewHolidayName("");
    toast.success(dates.length > 1 ? `${dates.length} hari libur berhasil ditambahkan.` : "Hari libur berhasil ditambahkan.");
    fetchHolidays();
  }

  async function deleteHoliday(id: string) {
    const holiday = holidays.find(h => h.id === id);
    setHolidays(prev => prev.filter(h => h.id !== id));
    toast("Hari libur dihapus.", {
      action: { label: "Urungkan", onClick: () => fetchHolidays() },
      duration: 8000,
    });
    const res = await fetch(`/api/admin/holidays?id=${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Gagal menghapus hari libur."); fetchHolidays(); }
  }

  function openEditClass(cls: ClassItem) {
    setEditingClass(cls);
    setFormError("");
    setForm({ name: cls.name, major_id: cls.major_id, grade_level: String(cls.grade_level), wali_kelas_id: cls.wali_kelas_id || "" });
    setDialogOpen(true);
  }

  function openAddClass() {
    setEditingClass(null);
    setFormError("");
    setForm({ name: "", major_id: "", grade_level: "10", wali_kelas_id: "" });
    setDialogOpen(true);
  }

  return (
    <SkeletonWrapper loading={loading} skeleton={<SettingsSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl"><Settings className="h-6 w-6 text-primary" /></div>
          <div><h1 className="font-heading text-2xl font-bold text-foreground">Pengaturan</h1><p className="text-sm text-muted-foreground">Konfigurasi sistem presensi</p></div>
        </div>
        <button onClick={handleSave} disabled={saving} className="clay-button-accent px-5 py-2.5 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Info */}
        <div className="clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <School className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Informasi Sekolah</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Nama Sekolah</label>
              <input value={settings.school_name} onChange={(e) => updateSetting("school_name", e.target.value)} className="clay-input w-full px-4 py-2.5 outline-none" />
            </div>
          </div>

        </div>

        {/* Presensi Per Mata Pelajaran */}
        <div className="clay-card p-6 lg:col-span-2">
          <div className="flex items-start gap-5">
            <BookOpen className="h-14 w-14 text-primary/20 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-bold text-foreground">Presensi Per Mata Pelajaran</h2>
              <p className="text-sm text-muted-foreground mt-1">Kelola mata pelajaran, guru pengampu, dan jadwal pelajaran</p>
              <Link
                href="/admin/pengaturan-presensi-mapel"
                className="clay-button inline-flex items-center justify-center text-center px-5 py-2.5 mt-4 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                Pengaturan Presensi Mapel
              </Link>
            </div>
          </div>
        </div>

        {/* Time Settings */}
        <div className="clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Pengaturan Waktu</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">Jam Masuk</label><input type="time" value={settings.morning_start} onChange={(e) => updateSetting("morning_start", e.target.value)} className="clay-input w-full px-4 py-2.5 outline-none" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">Batas Terlambat</label><input type="time" value={settings.late_threshold} onChange={(e) => updateSetting("late_threshold", e.target.value)} className="clay-input w-full px-4 py-2.5 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">Jam Pulang Mulai</label><input type="time" value={settings.afternoon_start} onChange={(e) => updateSetting("afternoon_start", e.target.value)} className="clay-input w-full px-4 py-2.5 outline-none" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-foreground">Jam Pulang Berakhir</label><input type="time" value={settings.afternoon_end} onChange={(e) => updateSetting("afternoon_end", e.target.value)} className="clay-input w-full px-4 py-2.5 outline-none" /></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <label className="text-sm font-bold text-foreground">Auto &quot;Terlambat&quot; berdasarkan waktu</label>
              <button
                onClick={() => updateSetting("auto_late", settings.auto_late === "true" ? "false" : "true")}
                className={`w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer relative ${settings.auto_late === "true" ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-200 shadow ${settings.auto_late === "true" ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Geofencing */}
        <div className="clay-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Pengaturan Lokasi</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <MapPicker
                lat={settings.school_lat}
                lng={settings.school_lng}
                onLocationChange={(lat, lng) => {
                  updateSetting("school_lat", lat);
                  updateSetting("school_lng", lng);
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Latitude</label>
                  <input
                    type="number" step="any"
                    value={settings.school_lat}
                    onChange={(e) => updateSetting("school_lat", e.target.value)}
                    className="clay-input w-full px-4 py-2.5 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Longitude</label>
                  <input
                    type="number" step="any"
                    value={settings.school_lng}
                    onChange={(e) => updateSetting("school_lng", e.target.value)}
                    className="clay-input w-full px-4 py-2.5 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Radius Geofencing (meter)</label>
                <input
                  type="number"
                  value={settings.geofence_radius}
                  onChange={(e) => updateSetting("geofence_radius", e.target.value)}
                  className="clay-input w-full px-4 py-2.5 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kelas & Wali */}
        <div className="clay-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-foreground">Kelas & Wali Kelas</h2>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <button onClick={openAddClass} className="w-8 h-8 rounded-xl bg-primary text-white hover:bg-primary/90 flex items-center justify-center cursor-pointer clay-transition">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
              <DialogContent className="sm:max-w-[500px] clay-card border-0 p-0">
                <div className="p-6">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-bold">
                      {editingClass ? "Edit Kelas" : "Tambah Kelas"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitClass} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Nama Kelas</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: X AKL 1" className="clay-input w-full px-4 py-2.5 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Jurusan</label>
                        <select value={form.major_id} onChange={(e) => setForm({ ...form, major_id: e.target.value })} className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer">
                          <option value="" disabled>Pilih jurusan</option>
                          {majors.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Tingkat</label>
                        <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer">
                          <option value="10">X (Kelas 10)</option>
                          <option value="11">XI (Kelas 11)</option>
                          <option value="12">XII (Kelas 12)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Wali Kelas <span className="text-muted-foreground font-normal">(opsional)</span></label>
                      <select value={form.wali_kelas_id} onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })} className="clay-input w-full px-4 py-2.5 outline-none cursor-pointer">
                        <option value="">Belum ditugaskan</option>
                        {teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                      </select>
                    </div>
                    {formError && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive">{formError}</div>
                    )}
                    <button type="submit" className="clay-button w-full py-3 text-white font-bold rounded-xl cursor-pointer">
                      {editingClass ? "Simpan Perubahan" : "Tambah Kelas"}
                    </button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {classes.map((cls) => (
              <div key={cls.id} className="p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground whitespace-nowrap">{cls.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditClass(cls)} className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center cursor-pointer clay-transition">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteClass(cls.id)} className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center cursor-pointer clay-transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{cls.majors?.name || "-"} · Tingkat {cls.grade_level}</p>
                <div className="mt-2">
                  {savingClassId === cls.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary inline-block mr-1" />}
                  <select
                    value={cls.wali_kelas_id || ""}
                    onChange={(e) => assignWali(cls.id, e.target.value)}
                    className="clay-input w-full px-3 py-1.5 text-xs rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">Pilih guru</option>
                    {teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Belum ada kelas</p>}
          </div>
        </div>

        {/* Hari Libur */}
        <div className="clay-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <CalendarOff className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Hari Libur Nasional</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Libur otomatis dihitung dari hari Sabtu & Minggu. Hari libur nasional atau cuti bersama bisa ditambahkan di bawah.</p>

          <div className="space-y-2 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-xs font-bold text-foreground">Tanggal Mulai</label>
                <input type="date" value={newHolidayStart} onChange={(e) => setNewHolidayStart(e.target.value)} className="clay-input w-full px-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-xs font-bold text-foreground">Tanggal Selesai <span className="text-muted-foreground font-normal">(opsional)</span></label>
                <input type="date" value={newHolidayEnd} onChange={(e) => setNewHolidayEnd(e.target.value)} min={newHolidayStart || undefined} className="clay-input w-full px-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-xs font-bold text-foreground">Nama Libur / Cuti Bersama</label>
                <input value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} className="clay-input w-full px-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="flex items-end">
                <button onClick={addHoliday} className="clay-button px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer shrink-0 flex items-center justify-center gap-1">
                  <Plus className="h-4 w-4" /> Tambah
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Isi <strong>Tanggal Selesai</strong> untuk cuti bersama beberapa hari. Kosongkan untuk 1 hari saja.</p>
          </div>
          {holidayError && <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2 text-sm font-medium text-destructive mb-4">{holidayError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {h.source === "api" ? "API" : "Manual"}</p>
                </div>
                <button onClick={() => deleteHoliday(h.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {holidays.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 col-span-full">Belum ada hari libur nasional</p>}
          </div>
        </div>
      </div>
      </div>
    </SkeletonWrapper>
  );
}
