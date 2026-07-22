require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Try direct SQL via PostgREST
  const sql = 'ALTER TABLE students ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;';
  
  // Use raw query via rpc if available, otherwise use direct PostgREST
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log('RPC exec_sql not available, trying alternative...');
    console.log('Error:', error.message);
    
    // Try using a direct query - Supabase doesn't allow direct ALTER TABLE via client
    // We need to use the SQL editor or a migration
    console.log('\nPlease run this SQL in Supabase Dashboard > SQL Editor:');
    console.log(sql);
  } else {
    console.log('Migration successful!');
  }
}

run().catch(console.error);