// Run raw SQL migration via Supabase REST API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use raw fetch to call PostgREST with raw SQL
async function runRawSQL(sql: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL failed: ${response.status} - ${text}`);
  }
  return response.json();
}

async function runMigration() {
  console.log('Running barcode migration via REST API...');
  
  try {
    // Try to create a temporary function to run SQL
    await runRawSQL(`
      CREATE OR REPLACE FUNCTION run_migration_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `);
    console.log('Created run_migration_sql function');
    
    // Now run the ALTER TABLE
    await runRawSQL(`
      SELECT run_migration_sql('ALTER TABLE students ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;');
    `);
    console.log('Added barcode column');
    
    // Update existing students
    await runRawSQL(`
      SELECT run_migration_sql('UPDATE students SET barcode = ''SIS'' || nis WHERE barcode IS NULL;');
    `);
    console.log('Updated existing students with barcodes');
    
    // Create index
    await runRawSQL(`
      SELECT run_migration_sql('CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode);');
    `);
    console.log('Created barcode index');
    
    // Drop the temporary function
    await runRawSQL(`DROP FUNCTION IF EXISTS run_migration_sql(text);`);
    console.log('Cleaned up');
    
  } catch (e) {
    console.log('Method 1 failed, trying direct approach...');
    
    // Fallback: Try direct table alteration via PostgREST
    try {
      // First check if column exists by trying to select it
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      
      // Try to update - if column doesn't exist, we'll get an error
      const { error } = await supabase
        .from('students')
        .update({ barcode: 'TEST' })
        .eq('nis', '999999'); // non-existent NIS
      
      if (error && error.message.includes('barcode')) {
        console.log('Column does not exist, need to add it via dashboard');
        console.log('\n=== RUN THIS SQL IN SUPABASE DASHBOARD ===');
        console.log(`
ALTER TABLE students ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;
UPDATE students SET barcode = 'SIS' || nis WHERE barcode IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode);
        `);
        console.log('==========================================');
      }
    } catch (e2) {
      console.log('Error:', e2);
    }
  }
}

runMigration().catch(console.error);