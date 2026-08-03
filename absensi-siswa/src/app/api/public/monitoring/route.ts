import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

export async function GET(req: NextRequest) {
  const rawQ = (req.nextUrl.searchParams.get("q") || "").trim();
  const date = req.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parameter date (YYYY-MM-DD) wajib diisi" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Sanitasi query pencarian agar aman untuk sintaks PostgREST (.or/ilike)
  const q = rawQ.replace(/[(),;]/g, "").slice(0, 100);

  let studentQuery = supabase
    .from("students")
    .select("id, nis, name, classes(name)")
    .order("name", { ascending: true })
    .limit(MAX_RESULTS);

  if (q) {
    studentQuery = studentQuery.or(`name.ilike.%${q}%,nis.ilike.%${q}%`);
  }

  const { data: students, error: studentError } = await studentQuery;

  if (studentError) {
    return NextResponse.json({ error: "Gagal memuat data siswa" }, { status: 500 });
  }

  if (!students || students.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const ids = students.map((s) => s.id);
  const { data: attendances, error: attError } = await supabase
    .from("attendance")
    .select("student_id, masuk_status, late_status, masuk_time, pulang_status, pulang_time")
    .eq("date", date)
    .in("student_id", ids);

  if (attError) {
    return NextResponse.json({ error: "Gagal memuat data presensi" }, { status: 500 });
  }

  const attMap = new Map((attendances || []).map((a) => [a.student_id, a]));

  const data = students.map((s) => {
    const att = attMap.get(s.id);
    return {
      nis: s.nis,
      name: s.name,
      class_name:
        (Array.isArray(s.classes) ? s.classes[0] : s.classes)?.name ?? null,
      masuk_status: att?.masuk_status ?? null,
      late_status: att?.late_status ?? null,
      masuk_time: att?.masuk_time ?? null,
      pulang_status: att?.pulang_status ?? null,
      pulang_time: att?.pulang_time ?? null,
    };
  });

  return NextResponse.json({ data });
}
