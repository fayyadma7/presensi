const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env.local
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

const rawNames = [
  "apt. Nur Fitri Widiyanti, S.Si., Gr.",
  "Firman Budiman S.Ag.",
  "Apit Nur Setiawan, S.Pd., Gr",
  "apt. Totok Turdiyanto, S.Si.,M.Farm.",
  "apt. Reina Melani, S.Si.,M.Farm.",
  "Regita Ning Permata Ayu, S.E., Gr",
  "apt. Rapeliana Umi Kholifah, S.Farm., Gr",
  "Riandhini Prihastuti. S.Pd., Gr",
  "Umar Haris Setiyadi, S.Pd., Gr",
  "Wilujeng Wachyu Utami, S.Si., M.Pd., Gr",
  "Teguh Priyanto, M.Pd, Gr",
  "Dhea Yulhaq Syazwani, S.Pd., Gr",
  "Fahra Hasna, S.Sos.",
  "Nur Hanifah, S.Sos., Gr",
  "Faridatun Hanifah, S.Pd., Gr",
  "Rudal Afgani Dirgantara, S.Pd., Gr",
  "Muhammad Hamdi Aufani, S.Pd., Gr",
  "Fayyad Malik Abdillah, S.Pd., Gr",
  "Algi Fari Hanif, S.Pd.",
  "Vena Khaterina, S.Pd.",
  "Anida Dwi Nur Khasanah, S.Pd.",
];

function cleanName(raw) {
  let name = raw
    .replace(/^(apt\.|dr\.|drh\.|H\.|Hj\.)\s*/i, "")
    .replace(/,.*$/, "")
    .replace(/\s*S\.\w+(\.\w+)?/g, "")
    .replace(/\s*M\.\w+(\.\w+)?/g, "")
    .replace(/\s*Gr\.?/g, "")
    .replace(/\s+\./g, ".")
    .replace(/\.$/, "")
    .trim()
    .replace(/\s+/g, " ");
  return name;
}

function getEmailPrefix(cleanedName, usedPrefixes) {
  const parts = cleanedName.toLowerCase().split(/\s+/).filter(Boolean);
  let prefix = parts[0].replace(/[^a-z0-9]/g, "");
  if (usedPrefixes.has(prefix)) {
    prefix = (parts[0] + parts[1]).replace(/[^a-z0-9]/g, "");
  }
  usedPrefixes.add(prefix);
  return prefix;
}

async function main() {
  console.log("=== Create Bulk Guru Accounts ===\n");

  const usedPrefixes = new Set();
  const results = [];

  for (let i = 0; i < rawNames.length; i++) {
    const cleaned = cleanName(rawNames[i]);
    const emailPrefix = getEmailPrefix(cleaned, usedPrefixes);
    const email = `${emailPrefix}@smkmuh3pbg.sch.id`;
    const password = `${emailPrefix}123`;

    console.log(`[${String(i + 1).padStart(2, "0")}] ${cleaned}`);
    console.log(`     Email: ${email}  |  Password: ${password}`);

    try {
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.log(`     ❌ GAGAL: ${createError.message}`);
        results.push({ name: cleaned, email, status: "gagal", error: createError.message });
        continue;
      }

      const { error: insertError } = await supabase.from("users").insert({
        id: user.user.id,
        email,
        name: cleaned,
        role: "guru",
      });

      if (insertError) {
        console.log(`     ❌ GAGAL insert users: ${insertError.message}`);
        results.push({ name: cleaned, email, status: "gagal", error: insertError.message });
        continue;
      }

      console.log(`     ✅ BERHASIL`);
      results.push({ name: cleaned, email, status: "berhasil" });
    } catch (err) {
      console.log(`     ❌ ERROR: ${err.message}`);
      results.push({ name: cleaned, email, status: "gagal", error: err.message });
    }
  }

  console.log("\n=== RINGKASAN ===");
  const sukses = results.filter((r) => r.status === "berhasil").length;
  const gagal = results.filter((r) => r.status === "gagal").length;
  console.log(`Total: ${results.length} | Berhasil: ${sukses} | Gagal: ${gagal}`);

  if (gagal > 0) {
    console.log("\nDaftar gagal:");
    results.filter((r) => r.status === "gagal").forEach((r) => {
      console.log(`  - ${r.name} (${r.email}): ${r.error}`);
    });
  }
}

main().catch(console.error);
