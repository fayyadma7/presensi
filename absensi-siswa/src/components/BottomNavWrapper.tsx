"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "./BottomNav";

export default function BottomNavWrapper({ userRole, isWaliKelas }: { userRole: string; isWaliKelas: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return <BottomNav onLogout={handleLogout} userRole={userRole} isWaliKelas={isWaliKelas} />;
}
