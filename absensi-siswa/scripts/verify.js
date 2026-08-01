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

async function verify() {
  console.log("=== Verifikasi Database ===\n");

  const { data: majors, error: e1 } = await supabase.from("majors").select("*");
  console.log("Jurusan:", e1 ? e1.message : majors);

  const { data: classes, error: e2 } = await supabase.from("classes").select("*");
  console.log("Kelas:", e2 ? e2.message : (classes ? classes.length + " kelas" : "kosong"));

  const { data: students, error: e3 } = await supabase.from("students").select("*");
  console.log("Siswa:", e3 ? e3.message : (students ? students.length + " siswa" : "kosong"));

  const { data: users, error: e4 } = await supabase.from("users").select("*");
  console.log("Users:", e4 ? e4.message : (users ? users.length + " user" : "kosong"));
}

verify();
