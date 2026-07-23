"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { School, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email atau password salah");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.role === "siswa") {
        router.push("/siswa/presensi");
      } else if (data?.role === "tenaga_kependidikan") {
        router.push("/tenaga-kependidikan/presensi");
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ zIndex: 1 }}>
      {/* Background doodle pattern */}
      <div className="login-bg fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Login Card - Claymorphism */}
      <div className="w-full max-w-md relative z-10">
        <div className="clay-card relative overflow-hidden p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.3)] mb-4">
                <School className="h-10 w-10 text-white" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Presensi Siswa
              </h1>
              <p className="text-muted-foreground mt-2 text-base">
                SMK Muhammadiyah 3 Purbalingga
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="clay-badge bg-destructive/10 text-destructive text-sm px-4 py-3 text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-foreground block">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="email@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="clay-input w-full px-4 py-3 text-base outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold text-foreground block">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="clay-input w-full px-4 py-3 text-base outline-none pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="clay-button-accent w-full py-3.5 text-white font-bold text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              &copy; {new Date().getFullYear()} <span className="font-bold">Fayyad Malik Abdillah</span>. All rights reserved.
            </p>
          {/* Top Stacked Waves */}
          <div className="absolute top-0 left-0 w-full h-[20%] min-h-[100px] pointer-events-none" style={{ transform: "rotate(180deg)" }}>
            <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full block">
              <path d="M0,200 L0,130 C360,95 720,155 1080,110 C1260,90 1440,120 1440,120 L1440,200 Z" fill="#C7D2FE" fillOpacity="0.07" />
              <path d="M0,200 L0,142 C200,112 460,162 720,128 C960,98 1240,145 1440,132 L1440,200 Z" fill="#A5B4FC" fillOpacity="0.06" />
              <path d="M0,200 L0,150 C300,120 600,165 900,135 C1100,112 1300,150 1440,142 L1440,200 Z" fill="#818CF8" fillOpacity="0.06" />
              <path d="M0,200 L0,158 C180,135 380,168 580,148 C780,128 1020,162 1440,150 L1440,200 Z" fill="#6366F1" fillOpacity="0.05" />
            </svg>
          </div>

          {/* Bottom Stacked Waves */}
          <div className="absolute bottom-0 left-0 w-full h-[35%] min-h-[160px] pointer-events-none">
            <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full block">
              <path d="M0,200 L0,120 C480,80 960,140 1440,100 L1440,200 Z" fill="#C7D2FE" fillOpacity="0.08" />
              <path d="M0,200 L0,135 C240,100 540,155 840,115 C1020,95 1260,130 1440,120 L1440,200 Z" fill="#A5B4FC" fillOpacity="0.07" />
              <path d="M0,200 L0,140 C360,105 720,160 1080,115 C1260,95 1440,125 1440,125 L1440,200 Z" fill="#818CF8" fillOpacity="0.07" />
              <path d="M0,200 L0,148 C160,125 320,158 480,138 C640,118 800,155 960,135 C1120,115 1280,148 1440,140 L1440,200 Z" fill="#6366F1" fillOpacity="0.07" />
              <path d="M0,200 L0,155 C200,130 440,165 680,142 C920,120 1200,158 1440,148 L1440,200 Z" fill="#4F46E5" fillOpacity="0.08" />
            </svg>
          </div>
          </div>
      </div>
    </div>
  );
}
