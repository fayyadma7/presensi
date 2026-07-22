import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";

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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = userData?.role || "";

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
    <AuthProvider serverUser={user} serverUserRole={userRole} serverIsWaliKelas={isWaliKelas}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 flex-1 w-full">
          {children}
        </main>
        <Footer />
        <BottomNavWrapper userRole={userRole} isWaliKelas={isWaliKelas} />
      </div>
    </AuthProvider>
  );
}
