const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hnbyyplmkpwlefpilbtu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnl5cGxta3B3bGVmcGlsYnR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5MTQ1NiwiZXhwIjoyMDk3MzY3NDU2fQ.oJW-cEgRfakd7NCeRjHkKUuY_XGeBHNnEna9dS5bkeM'
);

const students = [
  { id: '3ec3c5f9-23ea-48ff-8d27-0f94ff9033c1', nis: '12011', name: 'Rina Marlina' },
  { id: '8f16c216-8dc1-4e6e-ac1d-2e807279beb6', nis: '12012', name: 'Tono Sugiarto' },
  { id: '5311ad0a-6f53-42d5-8e7f-529a2b99d9a9', nis: '12013', name: 'Siti Nurhaliza' },
  { id: '67bc2515-1890-4252-89e4-eef6cdb7f9f8', nis: '12014', name: 'Bambang Pamungkas' },
  { id: 'c50c3bbb-96e6-4c72-99e6-d5a57f054333', nis: '12015', name: 'Dewi Kartika' },
  { id: 'b5b78e87-9ba7-4760-bab5-dc38b350fc36', nis: '12016', name: 'Ahmad Rizky' },
  { id: 'b61687b9-f580-43af-bd7e-aea4aa5bf8eb', nis: '12017', name: 'Maya Putri' },
  { id: '15d34f92-c455-48cd-bedb-fee767b710f0', nis: '12018', name: 'Fajar Nugroho' },
  { id: '8538cee1-9611-4adb-a1ec-fc55a6f0d8b4', nis: '12019', name: 'Lestari Wulan' },
  { id: '419fe49d-64cd-4b67-9e9b-88150129697c', nis: '12020', name: 'Hendra Wijaya' },
];

// Attendance: status, berangkat time, notes
// 8/6(Mon) 9/6(Tue) 10/6(Wed) 11/6(Thu) 12/6(Fri)
const plan = {
  '12011': [ // Rina - Model student, always hadir on time
    { d: '2026-06-08', s: 'hadir',     t: '07:00', n: null },
    { d: '2026-06-09', s: 'hadir',     t: '06:55', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '07:05', n: null },
    { d: '2026-06-11', s: 'hadir',    t: '06:58', n: null },
    { d: '2026-06-12', s: 'hadir',    t: '07:02', n: null },
  ],
  '12012': [ // Tono - Sering terlambat
    { d: '2026-06-08', s: 'hadir',     t: '06:50', n: null },
    { d: '2026-06-09', s: 'terlambat', t: '07:25', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '07:05', n: null },
    { d: '2026-06-11', s: 'terlambat', t: '07:30', n: null },
    { d: '2026-06-12', s: 'hadir',    t: '07:00', n: null },
  ],
  '12013': [ // Siti - Sering sakit (3 hari)
    { d: '2026-06-08', s: 'hadir',     t: '07:05', n: null },
    { d: '2026-06-09', s: 'sakit',    t: null,     n: 'Flu & demam tinggi, tidak bisa hadir' },
    { d: '2026-06-10', s: 'sakit',    t: null,     n: 'Masih panas dan pusing, istirahat di rumah' },
    { d: '2026-06-11', s: 'sakit',    t: null,     n: 'Masih dalam perawatan dokter' },
    { d: '2026-06-12', s: 'hadir',    t: '07:10', n: null },
  ],
  '12014': [ // Bambang - Jarang telat
    { d: '2026-06-08', s: 'terlambat', t: '07:20', n: null },
    { d: '2026-06-09', s: 'hadir',     t: '06:50', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '06:55', n: null },
    { d: '2026-06-11', s: 'hadir',    t: '07:00', n: null },
    { d: '2026-06-12', s: 'hadir',    t: '07:08', n: null },
  ],
  '12015': [ // Dewi - Sering izin (3 hari)
    { d: '2026-06-08', s: 'izin',     t: null,     n: 'Izin urusan keluarga mendadak' },
    { d: '2026-06-09', s: 'hadir',     t: '07:00', n: null },
    { d: '2026-06-10', s: 'izin',     t: null,     n: 'Izin acara keluarga besar' },
    { d: '2026-06-11', s: 'hadir',    t: '07:05', n: null },
    { d: '2026-06-12', s: 'izin',     t: null,     n: 'Izin keperluan pribadi' },
  ],
  '12016': [ // Ahmad - Sering alpa (3 hari)
    { d: '2026-06-08', s: 'hadir',     t: '06:55', n: null },
    { d: '2026-06-09', s: 'hadir',     t: '07:00', n: null },
    { d: '2026-06-10', s: 'alpa',     t: null,     n: null },
    { d: '2026-06-11', s: 'alpa',     t: null,     n: null },
    { d: '2026-06-12', s: 'alpa',     t: null,     n: null },
  ],
  '12017': [ // Maya - Campuran
    { d: '2026-06-08', s: 'terlambat', t: '07:35', n: null },
    { d: '2026-06-09', s: 'hadir',     t: '07:00', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '07:05', n: null },
    { d: '2026-06-11', s: 'sakit',    t: null,     n: 'Sakit kepala migrain' },
    { d: '2026-06-12', s: 'hadir',    t: '06:50', n: null },
  ],
  '12018': [ // Fajar - Hadir mostly, 1 izin
    { d: '2026-06-08', s: 'hadir',     t: '07:00', n: null },
    { d: '2026-06-09', s: 'hadir',     t: '06:55', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '07:00', n: null },
    { d: '2026-06-11', s: 'izin',     t: null,     n: 'Izin temani ortu ke dokter' },
    { d: '2026-06-12', s: 'hadir',    t: '06:50', n: null },
  ],
  '12019': [ // Lestari - Problematis: sakit + alpa
    { d: '2026-06-08', s: 'alpa',     t: null,     n: null },
    { d: '2026-06-09', s: 'sakit',    t: null,     n: 'Sakit perut sejak malam, mual & muntah' },
    { d: '2026-06-10', s: 'alpa',     t: null,     n: null },
    { d: '2026-06-11', s: 'sakit',    t: null,     n: 'Diare dan demam, harus istirahat total' },
    { d: '2026-06-12', s: 'hadir',    t: '07:10', n: null },
  ],
  '12020': [ // Hendra - Campuran
    { d: '2026-06-08', s: 'hadir',     t: '07:10', n: null },
    { d: '2026-06-09', s: 'terlambat', t: '07:25', n: null },
    { d: '2026-06-10', s: 'hadir',    t: '06:55', n: null },
    { d: '2026-06-11', s: 'hadir',    t: '07:00', n: null },
    { d: '2026-06-12', s: 'izin',     t: null,     n: 'Izin urusan sekolah lain' },
  ],
};

const SLAT = -7.4212, SLNG = 109.4418;
function loc() {
  return {
    lat: +(SLAT + (Math.random() - 0.5) * 0.002).toFixed(6),
    lng: +(SLNG + (Math.random() - 0.5) * 0.002).toFixed(6),
  };
}
function ts(date, time) {
  return new Date(date + 'T' + time + ':00+07:00').toISOString();
}

async function run() {
  // 1. Clear
  const ids = students.map(s => s.id);
  const { data: del } = await supabase.from('attendance').delete()
    .in('student_id', ids).gte('date', '2026-06-08').lte('date', '2026-06-12').select();
  console.log('Deleted:', del?.length || 0, 'old records');

  // 2. Build inserts
  const rows = [];
  for (const st of students) {
    const p = plan[st.nis];
    if (!p) continue;
    for (const r of p) {
      // berangkat record (skip alpa)
      if (r.s !== 'alpa') {
        const l = loc();
        rows.push({
          student_id: st.id,
          date: r.d,
          type: 'berangkat',
          status: r.s,
          timestamp: r.t ? ts(r.d, r.t) : null,
          location_lat: r.t ? l.lat : null,
          location_lng: r.t ? l.lng : null,
          notes: r.n,
        });
      }
      // pulang record (only hadir/terlambat)
      if (r.s === 'hadir' || r.s === 'terlambat') {
        const l2 = loc();
        const ph = 14, pm = Math.floor(Math.random() * 30);
        rows.push({
          student_id: st.id,
          date: r.d,
          type: 'pulang',
          status: 'pulang',
          timestamp: ts(r.d, ph + ':' + String(pm).padStart(2, '0')),
          location_lat: l2.lat,
          location_lng: l2.lng,
          notes: null,
        });
      }
    }
  }

  // 3. Batch insert
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('attendance').insert(rows.slice(i, i + 50));
    if (error) console.log('Insert error:', error.message);
  }
  console.log('Inserted:', rows.length, 'total records');

  // 4. Verify
  const { data: v } = await supabase.from('attendance')
    .select('student_id, date, type, status, notes, location_lat')
    .gte('date', '2026-06-08').lte('date', '2026-06-12')
    .order('date');

  const b = v.filter(a => a.type === 'berangkat');
  const p = v.filter(a => a.type === 'pulang');
  const sc = {};
  b.forEach(a => { sc[a.status] = (sc[a.status] || 0) + 1; });
  const withNotes = v.filter(a => a.notes);
  const withLoc = v.filter(a => a.location_lat);

  console.log('\n=== VERIFICATION ===');
  console.log('Total records:', v.length);
  console.log('Berangkat:', b.length);
  console.log('Pulang:', p.length);
  console.log('Status berangkat:', sc);
  console.log('Records with notes:', withNotes.length);
  console.log('Records with location:', withLoc.length);
  console.log('\nNotes detail:');
  withNotes.forEach(a => {
    const s = students.find(st => st.id === a.student_id);
    console.log('  ', s?.nis, s?.name, '|', a.date, a.status, '|', a.notes);
  });
}
run();
