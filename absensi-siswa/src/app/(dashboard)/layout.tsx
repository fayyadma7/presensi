import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role for bottom nav and client-side auth
  const { data: userData } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = userData?.role || "";
  const userName = userData?.name || "";

  // Check if guru is wali kelas
  let isWaliKelas = false;
  if (userRole === "guru") {
    const { data: kelasData } = await supabase
      .from("classes")
      .select("id")
      .eq("wali_kelas_id", user.id)
      .maybeSingle();
    isWaliKelas = !!kelasData;
  }

  return (
    <AuthProvider serverUser={user} serverUserRole={userRole} serverUserName={userName} serverIsWaliKelas={isWaliKelas}>
      <NavigationProvider>
        <DashboardShell userRole={userRole} isWaliKelas={isWaliKelas}>{children}</DashboardShell>
      </NavigationProvider>
    </AuthProvider>
  );
}
