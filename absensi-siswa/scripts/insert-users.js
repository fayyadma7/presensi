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

async function insertUsers() {
  console.log("=== Insert Users ===\n");

  // Get existing auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log("Auth users found:", authUsers.users.length);

  for (const user of authUsers.users) {
    const role = user.user_metadata?.role || "guru";
    const name = user.user_metadata?.name || user.email;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      name: name,
      role: role,
    }, { onConflict: "id" });

    if (error) {
      console.log(`Error inserting ${user.email}:`, error.message);
    } else {
      console.log(`Inserted: ${user.email} (${role})`);
    }
  }

  // Verify
  const { data: users } = await supabase.from("users").select("*");
  console.log("\nTotal users in table:", users?.length);
  console.log(users);
}

insertUsers();
