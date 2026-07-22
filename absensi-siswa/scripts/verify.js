const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://hnbyyplmkpwlefpilbtu.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnl5cGxta3B3bGVmcGlsYnR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5MTQ1NiwiZXhwIjoyMDk3MzY3NDU2fQ.oJW-cEgRfakd7NCeRjHkKUuY_XGeBHNnEna9dS5bkeM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
