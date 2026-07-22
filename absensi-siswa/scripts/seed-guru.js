const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hnbyyplmkpwlefpilbtu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnl5cGxta3B3bGVmcGlsYnR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5MTQ1NiwiZXhwIjoyMDk3MzY3NDU2fQ.oJW-cEgRfakd7NCeRjHkKUuY_XGeBHNnEna9dS5bkeM'
);

const today = new Date().toISOString().split('T')[0];
const SLAT = -7.4212, SLNG = 109.4418;
function loc() {
  return {
    lat: +(SLAT + (Math.random() - 0.5) * 0.002).toFixed(6),
    lng: +(SLNG + (Math.random() - 0.5) * 0.002).toFixed(6),
  };
}

function ts(time) {
  return new Date(today + 'T' + time + ':00+07:00').toISOString();
}

const gurus = [
  { name: 'Pak Ahmad', email: 'ahmad@guru.com', password: 'guru123', status: 'hadir', loginTime: '06:55' },
  { name: 'Pak Budi', email: 'budi@guru.com', password: 'guru123', status: 'hadir', loginTime: '07:00' },
  { name: 'Bu Sari', email: 'sari@guru.com', password: 'guru123', status: 'terlambat', loginTime: '07:25' },
  { name: 'Bu Dewi', email: 'dewi@guru.com', password: 'guru123', status: null, loginTime: null },
];

async function getAuthIdByEmail(email) {
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === email);
  return user?.id || null;
}

async function run() {
  // 1. Check Pak Guru
  const { data: existingPakGuru } = await supabase.from('users').select('id, name').eq('name', 'Pak Guru').single();
  if (existingPakGuru) {
    console.log('Pak Guru already exists:', existingPakGuru.id);
  }

  // 2. Create auth users + users table entries
  for (const g of gurus) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: g.email,
      password: g.password,
      email_confirm: true,
      user_metadata: { name: g.name, role: 'guru' },
    });

    if (authErr) {
      if (authErr.message.includes('already')) {
        console.log(g.name, '- auth already exists, looking up ID...');
        g.id = await getAuthIdByEmail(g.email);
        console.log('  Found ID:', g.id);
      } else {
        console.log(g.name, '- auth error:', authErr.message);
        continue;
      }
    } else {
      g.id = authUser?.user?.id;
      console.log(g.name, '- auth created:', g.id);
    }

    if (!g.id) {
      console.log(g.name, '- SKIPPED: no auth ID found');
      continue;
    }

    // Insert into users table (upsert to handle existing)
    const { error: userErr } = await supabase.from('users').upsert({
      id: g.id,
      email: g.email,
      name: g.name,
      role: 'guru',
    }, { onConflict: 'id' });

    if (userErr) {
      console.log(g.name, '- users upsert error:', userErr.message);
    } else {
      console.log(g.name, '- users table OK');
    }
  }

  // 3. Clear existing teacher_attendance for today (except Pak Guru)
  const newGuruIds = gurus.filter(g => g.id).map(g => g.id);
  if (newGuruIds.length > 0) {
    const { error } = await supabase.from('teacher_attendance').delete().in('teacher_id', newGuruIds).eq('date', today);
    console.log('\nCleared old attendance:', error ? error.message : 'OK');
  }

  // 4. Insert teacher_attendance for gurus with status
  for (const g of gurus) {
    if (!g.id || !g.status) {
      if (g.status === null) console.log(g.name, '- no attendance (never logged in today)');
      continue;
    }
    const l = loc();
    const { error } = await supabase.from('teacher_attendance').insert({
      teacher_id: g.id,
      date: today,
      status: g.status,
      login_time: ts(g.loginTime),
      logout_time: null,
      location_lat: l.lat,
      location_lng: l.lng,
      notes: null,
    });
    console.log(g.name, '- attendance:', g.status, error ? error.message : 'OK');
  }

  // 5. Verify
  console.log('\n=== VERIFICATION ===');
  const { data: allUsers } = await supabase.from('users').select('id, name, role').eq('role', 'guru').order('name');
  console.log('Total guru:', allUsers?.length || 0);
  allUsers?.forEach(u => console.log(' ', u.name));

  const { data: allAtt } = await supabase.from('teacher_attendance').select('teacher_id, status, login_time').eq('date', today);
  console.log('\nToday attendance:', allAtt?.length || 0);
  allAtt?.forEach(a => {
    const guru = allUsers?.find(u => u.id === a.teacher_id);
    const time = a.login_time ? new Date(a.login_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
    console.log(' ', guru?.name || a.teacher_id, '|', a.status, '|', time);
  });
}
run();
