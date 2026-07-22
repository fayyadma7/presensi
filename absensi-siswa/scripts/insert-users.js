const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://hnbyyplmkpwlefpilbtu.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnl5cGxta3B3bGVmcGlsYnR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5MTQ1NiwiZXhwIjoyMDk3MzY3NDU2fQ.oJW-cEgRfakd7NCeRjHkKUuY_XGeBHNnEna9dS5bkeM";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
