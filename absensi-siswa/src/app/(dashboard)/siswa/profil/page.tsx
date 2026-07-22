"use client";

import { useEffect, useState, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Skeleton, SkeletonCard, SkeletonForm } from "@/components/skeleton";
import { CheckCircle, XCircle, Clock, QrCode, User, Key, Lock, Shield } from "lucide-react";
import { toast } from "sonner";

interface SummaryRow {
  name: string;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
}

interface StudentInfo {
  name: string;
  nis: string;
  className: string;
}

function ProfileCard({ label, value, mono, icon: Icon }: { label: string; value: string; mono?: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 group">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <p className="text-sm font-bold text-gray-500">{label}</p>
      </div>
      <p className={`text-xl font-bold text-gray-900 ${mono ? "font-mono" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SiswaProfilSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
      <SkeletonForm fields={3} />
    </div>
  );
}

export default function SiswaProfilPage() {
  const supabase = createClient();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentNis, setStudentNis] = useState("");
  const [className, setClassName] = useState("");
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      const [studentResult, attResult] = await Promise.all([
        supabase.from("students").select("nis, name, classes(name)").eq("id", userId).maybeSingle(),
        supabase.from("attendance").select("masuk_status").eq("student_id", userId),
      ]);

      const { data: student } = studentResult;
      if (student) {
        setStudentName(student.name);
        setStudentNis(student.nis);
        setClassName(Array.isArray(student.classes) ? student.classes[0]?.name || "" : (student.classes as { name: string })?.name || "");

        const { data: attData } = attResult;
        if (attData) {
          const summary = attData.reduce(
            (acc: { name: string; hadir: number; terlambat: number; sakit: number; izin: number; alpa: number }, cur: { masuk_status: string | null }) => {
              const ms = cur.masuk_status;
              if (ms === "hadir") acc.hadir++;
              else if (ms === "terlambat") acc.terlambat++;
              else if (ms === "sakit") acc.sakit++;
              else if (ms === "izin") acc.izin++;
              return acc;
            },
            { name: "", hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 }
          );
          summary.name = student.name;
          setSummary(summary);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase, userId]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Password baru dan konfirmasi tidak cocok");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setChangePasswordLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    if (error) {
      toast.error("Gagal ganti password: " + error.message);
    } else {
      toast.success("Password berhasil diganti");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    }
    setChangePasswordLoading(false);
  };

  return (
    <SkeletonWrapper loading={loading} skeleton={<SiswaProfilSkeleton />}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <User className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
      </div>

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProfileCard label="Nama" value={studentName} icon={User} />
        <ProfileCard label="NIS" value={studentNis} mono icon={QrCode} />
        <ProfileCard label="Kelas" value={className || "Tidak ada"} icon={CheckCircle} />
      </div>

      {/* Rekap Presensi - 1 Baris */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="font-bold text-gray-900">Rekap Presensi</h2>
        </div>
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <SummaryCard label="Hadir" value={summary.hadir} color="text-green-600" />
            <SummaryCard label="Terlambat" value={summary.terlambat} color="text-amber-600" />
            <SummaryCard label="Sakit" value={summary.sakit} color="text-blue-600" />
            <SummaryCard label="Izin" value={summary.izin} color="text-purple-600" />
            <SummaryCard label="Alpha" value={summary.alpa} color="text-red-600" />
            <SummaryCard label="Total" value={summary.hadir + summary.terlambat + summary.sakit + summary.izin + summary.alpa} color="text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <SummaryCard label="Hadir" value={0} color="text-green-600" />
            <SummaryCard label="Terlambat" value={0} color="text-amber-600" />
            <SummaryCard label="Sakit" value={0} color="text-blue-600" />
            <SummaryCard label="Izin" value={0} color="text-purple-600" />
            <SummaryCard label="Alpha" value={0} color="text-red-600" />
            <SummaryCard label="Total" value={0} color="text-indigo-600" />
          </div>
        )}
      </div>

      {/* Ganti Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Lock className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="font-bold text-gray-900">Ganti Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password Lama</label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Masukkan password lama"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Ulangi password baru"
            />
          </div>
          <button
            type="submit"
            disabled={changePasswordLoading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {changePasswordLoading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </div>
    </SkeletonWrapper>
  );
}