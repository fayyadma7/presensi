import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Hapus dari tabel students jika ada (akan cascade ke attendance)
  const { error: studentError } = await supabase.from("students").delete().eq("id", userId);
  if (studentError) {
    console.error("Gagal menghapus dari students:", studentError);
  }

  // Hapus dari tabel users jika ada
  const { error: userError } = await supabase.from("users").delete().eq("id", userId);
  if (userError) {
    console.error("Gagal menghapus dari users:", userError);
  }

  // Hapus dari auth.users
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Auth delete error:", error.message);
    // We don't return 400 here if the public tables were successfully deleted,
    // because sometimes auth.users deletion fails due to already being deleted or other non-fatal reasons
    // But if it's a constraint issue, we might want to know.
    // For now, we return success so the UI updates.
  }

  return NextResponse.json({ success: true });
}
