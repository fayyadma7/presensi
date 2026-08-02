"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useNavigationTransition } from "@/contexts/NavigationContext";
import BottomNav from "./BottomNav";

export default function BottomNavWrapper({ userRole, isWaliKelas }: { userRole: string; isWaliKelas: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const { beginLogout } = useNavigationTransition();

  async function handleLogout() {
    window.localStorage.setItem("presensi:loggedOut", "1");
    beginLogout();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return <BottomNav onLogout={handleLogout} userRole={userRole} isWaliKelas={isWaliKelas} />;
}
