"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import Footer from "@/components/Footer";
import { useNavigationTransition } from "@/contexts/NavigationContext";
import DashboardContentSkeleton from "@/components/DashboardContentSkeleton";
import PwaSplash from "@/components/PwaSplash";
import { createClient } from "@/lib/supabase/client";

const LOGGED_OUT_KEY = "presensi:loggedOut";

export default function DashboardShell({ children, userRole, isWaliKelas }: { children: ReactNode; userRole: string; isWaliKelas: boolean }) {
  const { pendingHref, isLoggingOut } = useNavigationTransition();
  const router = useRouter();
  const supabase = createClient();

  // Flag sinkron: jika user baru saja logout, JANGAN render konten dashboard
  // (mencegah flash halaman dashboard saat tombol kembali HP restore dari cache).
  const [verified, setVerified] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(LOGGED_OUT_KEY) !== "1";
  });

  // Auth guard: verifikasi sesi via getUser() (bukan context/prop yang bisa basi).
  // Hanya dijalankan sekali saat mount — tidak perlu re-run setiap navigasi
  // (NavigationContext sudah menangani clear pendingHref saat URL berubah).
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      window.localStorage.removeItem(LOGGED_OUT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pulihkan tampilan normal setelah verifikasi sesi
      setVerified(true);
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoggingOut || !verified) {
    return <PwaSplash />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 flex-1 w-full">
        {pendingHref ? <DashboardContentSkeleton /> : children}
      </main>
      <Footer />
      <BottomNavWrapper userRole={userRole} isWaliKelas={isWaliKelas} />
    </div>
  );
}
