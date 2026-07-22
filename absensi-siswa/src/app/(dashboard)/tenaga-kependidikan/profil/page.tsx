"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Lock } from "lucide-react";
import { SkeletonCard } from "@/components/skeleton";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { toast } from "sonner";

function ProfileCard({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="clay-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold text-foreground ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}

function ProfilSkeleton() {
  return (
    <>
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-3">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-2xl" />
        <div className="h-12 w-full bg-muted animate-pulse rounded-2xl" />
        <div className="h-12 w-full bg-muted animate-pulse rounded-2xl" />
        <div className="h-12 w-full bg-muted animate-pulse rounded-2xl" />
        <div className="h-12 w-48 bg-muted animate-pulse rounded-2xl" />
      </div>
    </>
  );
}

export default function TenagaKependidikanProfilPage() {
  const supabase = createClient();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      const { data: profile } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle();
      if (profile) {
        setUserName(profile.name);
        setUserEmail(profile.email);
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
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    }
    setChangePasswordLoading(false);
  };

  return (
    <SkeletonWrapper loading={loading} skeleton={<ProfilSkeleton />}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <User className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Profil Tenaga Kependidikan</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProfileCard label="Nama" value={userName} icon={User} />
          <ProfileCard label="Email" value={userEmail} icon={Mail} />
        </div>

        {/* Ganti Password */}
        <div className="clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading font-bold text-foreground">Ganti Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Password Baru</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="clay-input h-11 px-4 rounded-xl w-full"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="clay-input h-11 px-4 rounded-xl w-full"
                placeholder="Ulangi password baru"
              />
            </div>
            <button
              type="submit"
              disabled={changePasswordLoading}
              className="clay-button px-6 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full"
            >
              {changePasswordLoading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        </div>
      </div>
    </SkeletonWrapper>
  );
}
