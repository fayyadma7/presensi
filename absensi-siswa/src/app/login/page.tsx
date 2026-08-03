"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { School, Loader2, Eye, EyeOff } from "lucide-react";
import PwaSplash from "@/components/PwaSplash";
import MonitoringCard from "@/components/MonitoringCard";

const LOGGED_OUT_KEY = "presensi:loggedOut";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Tombol kembali di halaman login → keluar aplikasi (bukan stay di login,
  // bukan kembali ke dashboard yang ter-cache di history).
  // pushState menyediakan entry tambahan agar back pertama memicu popstate,
  // lalu history.back() melangkah mundur terus hingga entry habis → browser keluar.
  // Flash dashboard tercegah oleh flag presensi:loggedOut di DashboardShell.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    function handlePopState() {
      window.history.back();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

    window.localStorage.removeItem(LOGGED_OUT_KEY);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const destination = data?.role === "siswa"
        ? "/siswa/presensi"
        : data?.role === "tenaga_kependidikan"
          ? "/tenaga-kependidikan/presensi"
          : "/dashboard";
      flushSync(() => setRedirecting(true));
      requestAnimationFrame(() => router.push(destination));
    } else {
      flushSync(() => setRedirecting(true));
      requestAnimationFrame(() => router.push("/dashboard"));
    }
  }

  if (redirecting) {
    return <PwaSplash />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center relative" style={{ zIndex: 1 }}>
      {/* Background doodle pattern */}
      <div className="login-bg fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Konten utama */}
      <div className="relative z-10 w-full max-w-md px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Card Login - Claymorphism */}
        <div className="clay-card relative overflow-hidden login-card-waves p-8">
          <div className="relative z-10">
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
                className="relative z-10 clay-button-accent w-full py-3.5 text-white font-bold text-base rounded-2xl disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
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
          </div>
          </div>

          {/* Card Monitoring Presensi untuk Orang Tua (terpisah dari card login) */}
          <div className="mt-6">
            <MonitoringCard />
          </div>
        </div>

      {/* Footer / Hak Cipta */}
      <footer className="w-full py-4 text-center text-xs text-foreground/40 border-t border-foreground/10 relative z-10">
        <p>
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-bold text-foreground/60">Fayyad Malik Abdillah</span>. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
