const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://hnbyyplmkpwlefpilbtu.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnl5cGxta3B3bGVmcGlsYnR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5MTQ1NiwiZXhwIjoyMDk3MzY3NDU2fQ.oJW-cEgRfakd7NCeRjHkKUuY_XGeBHNnEna9dS5bkeM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log("=== SETUP PRESENSI SISWA SMK MUHAMMADIYAH 3 PURBALINGGA ===\n");

  // Step 1: Create admin user
  console.log("[1/2] Membuat admin user...");
  const adminEmail = "admin@smk3.sch.id";
  const adminPassword = "Admin123!@#";

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: "Administrator",
      role: "admin",
    },
  });

  if (authError) {
    if (authError.message.includes("already exists")) {
      console.log(`  -> User ${adminEmail} sudah ada, skip...`);
    } else {
      console.error("  -> Error:", authError.message);
    }
  } else {
    console.log(`  -> Admin user berhasil dibuat!`);
    console.log(`     Email: ${adminEmail}`);
    console.log(`     Password: ${adminPassword}`);

    // Insert into users table
    const { error: insertError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: adminEmail,
      name: "Administrator",
      role: "admin",
    });

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        console.log("  -> User sudah ada di tabel users, skip...");
      } else {
        console.error("  -> Error insert ke tabel users:", insertError.message);
      }
    } else {
      console.log("  -> Berhasil insert ke tabel users");
    }
  }

  // Step 2: Create guru user
  console.log("\n[2/2] Membuat guru user...");
  const guruEmail = "guru@smk3.sch.id";
  const guruPassword = "Guru123!@#";

  const { data: guruData, error: guruError } = await supabase.auth.admin.createUser({
    email: guruEmail,
    password: guruPassword,
    email_confirm: true,
    user_metadata: {
      name: "Pak Guru",
      role: "guru",
    },
  });

  if (guruError) {
    if (guruError.message.includes("already exists")) {
      console.log(`  -> User ${guruEmail} sudah ada, skip...`);
    } else {
      console.error("  -> Error:", guruError.message);
    }
  } else {
    console.log(`  -> Guru user berhasil dibuat!`);
    console.log(`     Email: ${guruEmail}`);
    console.log(`     Password: ${guruPassword}`);

    const { error: insertError } = await supabase.from("users").insert({
      id: guruData.user.id,
      email: guruEmail,
      name: "Pak Guru",
      role: "guru",
    });

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        console.log("  -> User sudah ada di tabel users, skip...");
      } else {
        console.error("  -> Error insert ke tabel users:", insertError.message);
      }
    } else {
      console.log("  -> Berhasil insert ke tabel users");
    }
  }

  console.log("\n=== SELESAI ===");
  console.log("\nAkun yang dibuat:");
  console.log("  Admin: admin@smk3.sch.id / Admin123!@#");
  console.log("  Guru:  guru@smk3.sch.id / Guru123!@#");
  console.log("\nLANGKAH SELANJUTNYA:");
  console.log("1. Buka Supabase Dashboard → SQL Editor");
  console.log("2. Copy isi file supabase/schema.sql");
  console.log("3. Paste di SQL Editor → Klik 'Run'");
  console.log("4. Jalankan: npm run dev");
  console.log("5. Buka: http://localhost:3000/login");
}

setup().catch(console.error);
