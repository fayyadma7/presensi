import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface ImportUser {
  email: string;
  password: string;
  name: string;
  role: string;
  nis?: string;
  class_id?: string;
}

export async function POST(req: NextRequest) {
  const { users } = await req.json();

  if (!users || !Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: "users array required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: { index: number; success: boolean; error?: string; userId?: string }[] = [];

  for (let i = 0; i < users.length; i++) {
    const user: ImportUser = users[i];

    if (!user.email || !user.password || !user.name || !user.role) {
      results.push({ index: i, success: false, error: "Field wajib kosong (email, password, name, role)" });
      continue;
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role },
    });

    if (authError) {
      results.push({ index: i, success: false, error: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // 2. Insert into users table
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    if (userError) {
      results.push({ index: i, success: false, error: `users table: ${userError.message}` });
      continue;
    }

    // 3. If student, insert into students table
    if (user.role === "siswa" && user.nis) {
      const { error: studentError } = await supabase.from("students").insert({
        id: userId,
        nis: user.nis,
        barcode: user.nis,
        name: user.name,
        class_id: user.class_id || null,
        email: user.email,
        status: "active",
      });

      if (studentError) {
        results.push({ index: i, success: false, error: `students table: ${studentError.message}` });
        continue;
      }
    }

    results.push({ index: i, success: true, userId });
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ results, succeeded, failed, total: users.length });
}
