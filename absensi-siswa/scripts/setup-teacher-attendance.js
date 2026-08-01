const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const envRaw = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envRaw.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) envVars[k.trim()] = v.join("=").trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("GAGAL: SUPABASE_URL atau SERVICE_ROLE_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setup() {
  console.log("=== SETUP TEACHER ATTENDANCE TABLE ===\n");

  // 1. Create teacher_attendance table
  console.log("[1/3] Membuat tabel teacher_attendance...");
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS teacher_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        login_time TIMESTAMPTZ DEFAULT now(),
        logout_time TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'terlambat', 'izin', 'alpa')),
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_attendance_unique ON teacher_attendance(teacher_id, date);
      CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
      CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
    `,
  });

  if (e1) {
    console.log("  RPC failed, trying direct SQL via Supabase Dashboard...");
    console.log("  Jalankan SQL ini di Supabase SQL Editor:");
    console.log(`
      CREATE TABLE IF NOT EXISTS teacher_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        login_time TIMESTAMPTZ DEFAULT now(),
        logout_time TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'terlambat', 'izin', 'alpa')),
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_attendance_unique ON teacher_attendance(teacher_id, date);
      CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
      CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
    `);
    return;
  }
  console.log("  -> Tabel teacher_attendance berhasil dibuat!\n");

  // 2. Enable RLS
  console.log("[2/3] Mengaktifkan RLS...");
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Authenticated users can read teacher_attendance"
        ON teacher_attendance FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "Authenticated users can insert teacher_attendance"
        ON teacher_attendance FOR INSERT
        TO authenticated
        WITH CHECK (true);

      CREATE POLICY "Authenticated users can update teacher_attendance"
        ON teacher_attendance FOR UPDATE
        TO authenticated
        USING (true);
    `,
  });
  if (e2) console.log("  -> RLS mungkin sudah aktif atau jalankan manual di SQL Editor");
  else console.log("  -> RLS berhasil diaktifkan!\n");

  // 3. Insert sample data for testing
  console.log("[3/3] Insert data test...");
  const { data: gurus } = await supabase.from("users").select("id").eq("role", "guru");
  if (gurus && gurus.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const { error: e3 } = await supabase.from("teacher_attendance").upsert(
      gurus.map((g) => ({
        teacher_id: g.id,
        date: today,
        status: "hadir",
        login_time: new Date().toISOString(),
      })),
      { onConflict: "teacher_id,date" }
    );
    if (e3) console.log("  -> Data test mungkin sudah ada:", e3.message);
    else console.log("  -> Data test guru hari ini berhasil ditambahkan!");
  }

  console.log("\n=== SELESAI ===");
}

setup().catch(console.error);
