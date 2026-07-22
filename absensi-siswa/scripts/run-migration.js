const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running barcode migration...');
  
  // Try to add barcode column
  try {
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE students ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;'
    });
    if (alterError) console.log('Column might exist:', alterError.message);
    else console.log('✓ Added barcode column');
  } catch (e) {
    console.log('RPC not available, trying direct query...');
  }
  
  // Update existing students
  try {
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: "UPDATE students SET barcode = 'SIS' || nis WHERE barcode IS NULL;"
    });
    if (updateError) console.log('Update error:', updateError.message);
    else console.log('✓ Updated existing students with barcodes');
  } catch (e) {
    console.log('Update failed:', e.message);
  }
  
  // Create index
  try {
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode);'
    });
    if (indexError) console.log('Index error:', indexError.message);
    else console.log('✓ Created barcode index');
  } catch (e) {
    console.log('Index failed:', e.message);
  }
  
  // Verify
  const { data, error } = await supabase.from('students').select('nis, name, barcode').limit(5);
  if (data) {
    console.log('\nSample students with barcodes:');
    data.forEach(s => console.log(`  ${s.nis} - ${s.name} - ${s.barcode}`));
  }
}

runMigration().catch(console.error);