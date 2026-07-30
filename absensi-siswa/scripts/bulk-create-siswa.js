const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const classes = [
  { name: 'X TF A', students: [
    ['Ainun Nur Mubarokah', 1928], ['Anisa Sabila R', 1929], ['Aolia Ayun Najwa', 1930],
    ['Arina Amalia', 1931], ['Azra Anandha Kurniawan', 1932], ['Desti Putri Mukharromah', 1933],
    ['Devan Khoiru Rohman', 1934], ['Devi Meliana', 1935], ['Diandra Dwilya Putri', 1936],
    ['Fadil Nur Arifin', 1937], ['Hafizhah Wahyuningtyas', 1938], ['Hana Eka Saputri', 1939],
    ['Icha Rahelia Amanda', 1940], ['Iqbal Zakwan', 1941], ['Jely Dwi Harjanti', 1942],
    ['Kanza Nabila', 1943], ['Lestiana Eka Saputri', 1944], ['Liana Rizka Malihaqul Karimah', 1945],
    ['Luisa Fitriani', 1946], ['Mike Avrilia', 1947], ['Nikenzie Isna Qurrata A\'ayun', 1948],
    ['Panut Budi Setyaningrum', 1949], ['Rara Andina Candraningtyas', 1950],
    ['Sazkiya Azzahra', 1951], ['Siska Auliani Putri', 1952], ['Sofia Putri Pratama', 1953],
    ['Verda Afiqah Rahma', 1954], ['Zidna Ainun Nikmah', 1955],
  ]},
  { name: 'X TF B', students: [
    ['Adila Syifa Nurrevita', 1956], ['Afika Nila Saputri', 1957], ['Aisyahrli Umaeroh', 1958],
    ['Alzya Windy Oktafiana', 1959], ['Annisa Pinasti Nur Fatma', 1960],
    ['Arivva Zwana Putri', 1961], ['Asrie Fitra Safana', 1962], ['Avalisha Rifan Mitzy', 1963],
    ['Bintang Nur Ramadhani', 1964], ['Chalisa Ghina Zakauha', 1965],
    ['Daffa Mauli Febrianto', 1966], ['Elvira Febriyona Rahayuni', 1967],
    ['Faizal Gus Nasrullah', 1968], ['Fitri Nur Ramadhani', 1969],
    ['Linka Pisi Ramadhani', 1970], ['Meunasha Utami', 1971], ['Mohamad Akbar', 1972],
    ['Nabila Juliya Putri', 1973], ['Nadya Sekar Humayra', 1974], ['Nafisya Azahra', 1975],
    ['Naila Farkhah Salsabilla', 1976], ['Najwa Nafi\'ah', 1977], ['Nur Maharani', 1978],
    ['Nur Zahra Alya Nabilah', 1979], ['Sellyn Dwi Indah', 1980],
    ['Syifana Salsabila Putri', 1981], ['Udara Nadine Apriliasari', 1982],
    ['Wilutama Uzma Pambayun', 1983], ['Yuanda Anindita', 1984],
    ['Zhivara Aulia Nur Aji Syahputri', 1985],
  ]},
  { name: 'X AKL', students: [
    ['Adinda Oxaviona Putri', 1986], ['Amanda Anggraeni', 1987], ['Anif Marcella', 1988],
    ['Anisa Novianti', 1989], ['Annisa Nur Ramadhani', 1990], ['Araya Tri Ardana', 1991],
    ['Arum Sya\'bani', 1992], ['Asfia Lianlin', 1993], ['Aulia Agitarani', 1994],
    ['Bela Regina Aulia', 1995], ['Dewi Muhsita Peni', 1996], ['Dhea Gita Amelia', 1997],
    ['Dian Khasna Anjali', 1998], ['Endhita Putri Aulia', 1999],
    ['Fadila Ayu Khairunnisa', 2000], ['Feliza Safadina', 2001], ['Ferdina Yulita Rahayu', 2002],
    ['Gina Nur Puspitasari', 2003], ['Iren Cahya Pramesti', 2004], ['Ita Maliahah', 2005],
    ['Khansa Sekar Putri', 2006], ['Legia Husnul', 2007], ['Muhamad Dwi Bahtiar', 2008],
    ['Muhammad Nur Ikhwan', 2009], ['Naila Putri', 2010], ['Naila Sadira Afiqah', 2011],
    ['Navizatun Hasanah', 2013], ['Putri Maulia Rahma', 2014], ['Qhinanti Ayunda Facha', 2015],
    ['Revan', 2016], ['Rizki Saputra', 2017], ['Savira Tri Yuniar', 2018],
    ['Sesillia Prismanda Putri', 2019], ['Setiawan Agesstyo', 2020],
    ['Sinta April Liana', 2021], ['Tiara Restu Hidayah', 2022],
    ['Vanesa Bilqis Hanum Mikenzo', 2023], ['Yasri Latifah', 2024],
  ]},
];

function padNis(nis) {
  return String(nis).padStart(6, '0');
}

(async () => {
  console.log('Starting bulk creation...\n');

  for (const cls of classes) {
    // 1. Create class
    console.log(`--- Creating class: ${cls.name} ---`);
    const { data: existingClass, error: findErr } = await supabase
      .from('classes')
      .select('id')
      .eq('name', cls.name)
      .maybeSingle();

    let classId;
    if (existingClass) {
      classId = existingClass.id;
      console.log(`  Class already exists: ${existingClass.id}`);
    } else {
      const { data: newClass, error: classErr } = await supabase
        .from('classes')
        .insert({ name: cls.name, grade_level: 10 })
        .select('id')
        .single();
      if (classErr) { console.error(`  FAILED to create class: ${classErr.message}`); continue; }
      classId = newClass.id;
      console.log(`  Created class: ${classId}`);
    }

    // 2. Create students
    for (const [name, nis] of cls.students) {
      const email = `${nis}@siswa.smk3.sch.id`;
      const password = padNis(nis);

      // Check if student already exists
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('nis', String(nis))
        .maybeSingle();

      if (existing) {
        console.log(`  SKIP (exists): ${nis} ${name}`);
        continue;
      }

      // Create auth user
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'siswa' },
      });

      if (authErr) {
        console.error(`  FAILED auth for ${nis} ${name}: ${authErr.message}`);
        continue;
      }

      const userId = authUser.user.id;

      // Insert into students table
      const { error: studentErr } = await supabase.from('students').insert({
        id: userId,
        nis: String(nis),
        barcode: String(nis),
        name,
        class_id: classId,
        email,
      });

      if (studentErr) {
        console.error(`  FAILED students insert for ${nis} ${name}: ${studentErr.message}`);
        // Clean up the auth user
        await supabase.auth.admin.deleteUser(userId);
        continue;
      }

      // Insert into users table
      const { error: userErr } = await supabase.from('users').insert({
        id: userId,
        email,
        name,
        role: 'siswa',
      });

      if (userErr) {
        console.error(`  FAILED users insert for ${nis} ${name}: ${userErr.message}`);
        // Clean up
        await supabase.from('students').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        continue;
      }

      console.log(`  OK: ${nis} ${email} ${password} — ${name}`);
    }

    console.log('');
  }

  console.log('DONE!');
})();
