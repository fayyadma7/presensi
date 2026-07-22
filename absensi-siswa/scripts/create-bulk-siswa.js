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

// Major IDs from migration
const MAJOR_AKL = "a1b2c3d4-e5f6-7890-abcd-ef1234567801";
const MAJOR_TF = "a1b2c3d4-e5f6-7890-abcd-ef1234567802";

// Class definitions
const classDefs = [
  { name: "XI LPBS A", grade_level: 11, major_id: MAJOR_AKL },
  { name: "XI LPBS B", grade_level: 11, major_id: MAJOR_AKL },
  { name: "XII LPBS", grade_level: 12, major_id: MAJOR_AKL },
  { name: "XI LPK3 A", grade_level: 11, major_id: MAJOR_TF },
  { name: "XI LPK3 B", grade_level: 11, major_id: MAJOR_TF },
  { name: "XI LPK3 C", grade_level: 11, major_id: MAJOR_TF },
  { name: "XII LPK3 A", grade_level: 12, major_id: MAJOR_TF },
  { name: "XII LPK3 B", grade_level: 12, major_id: MAJOR_TF },
];

// Student data: [nis, name, className]
const studentData = [
  // XI LPBS A
  ["1863", "Adinda Regina Putri", "XI LPBS A"],
  ["1864", "Aira Rahma Hafiza", "XI LPBS A"],
  ["1865", "Alysa Rahmania", "XI LPBS A"],
  ["1866", "Amelia Putri Novea", "XI LPBS A"],
  ["1867", "Anisa Nur Aini", "XI LPBS A"],
  ["1868", "Annastacia Dewi", "XI LPBS A"],
  ["1869", "Danis Dicki Pranata", "XI LPBS A"],
  ["1870", "Delta Panji Purbandaru", "XI LPBS A"],
  ["1871", "Dinda Putri Valencia", "XI LPBS A"],
  ["1873", "Eka Nur Prasetyo", "XI LPBS A"],
  ["1874", "Elena Friska Oktina", "XI LPBS A"],
  ["1875", "Hanif Nur Sahadah", "XI LPBS A"],
  ["1876", "Ilmi Aulia Afa", "XI LPBS A"],
  ["1877", "Keyla Salma Alghani", "XI LPBS A"],
  ["1878", "Laddy Yasintha Az Zahra Priyanto", "XI LPBS A"],
  ["1880", "Laely Nur Azizah", "XI LPBS A"],
  ["1881", "Mar'Atun Khaulifakh", "XI LPBS A"],
  ["1882", "Nia Nur Afifah", "XI LPBS A"],
  ["1883", "Prima Maolia Suryani", "XI LPBS A"],
  ["1884", "Qulistiawati Syafriah", "XI LPBS A"],
  ["1885", "Rafifa Khumaira", "XI LPBS A"],
  ["1886", "Safi Nur Azizah", "XI LPBS A"],
  ["1887", "Selvi Dwi Riyani", "XI LPBS A"],
  ["1889", "Setia Rahmawanti", "XI LPBS A"],
  ["1888", "Shifa Aulia Nabila", "XI LPBS A"],
  ["1890", "Sina Al Azis", "XI LPBS A"],
  ["1891", "Syifa Un Nabilah", "XI LPBS A"],
  ["1892", "Vero Azan Pradita", "XI LPBS A"],
  ["1893", "Vitri Kamelia", "XI LPBS A"],
  ["1894", "Wati Rahmadani", "XI LPBS A"],
  ["1895", "Zhafirah Nur Mawaddah", "XI LPBS A"],

  // XI LPBS B
  ["1897", "A'An Sofiyah", "XI LPBS B"],
  ["1898", "Agreta Pramesti", "XI LPBS B"],
  ["1899", "Aina Nurhafizah", "XI LPBS B"],
  ["1900", "Aisyah Khalifah Firdaus", "XI LPBS B"],
  ["1901", "Amira Oktafiani", "XI LPBS B"],
  ["1902", "Andini Apriana", "XI LPBS B"],
  ["1903", "Ata Safa Liyana", "XI LPBS B"],
  ["1904", "Desta Puspita Rini", "XI LPBS B"],
  ["1905", "Desy Tri Wulandari", "XI LPBS B"],
  ["1906", "Dwi Widianingsih", "XI LPBS B"],
  ["1907", "Dwi Yuliafrizan Misroabi", "XI LPBS B"],
  ["1908", "Fian Rahma Hidayah", "XI LPBS B"],
  ["1909", "Irma Ayu Anggraeni", "XI LPBS B"],
  ["1910", "Latifah", "XI LPBS B"],
  ["1911", "Nafisya Wandawi", "XI LPBS B"],
  ["1913", "Nofal Refiani", "XI LPBS B"],
  ["1914", "Novi Rianti", "XI LPBS B"],
  ["1915", "Rachel Aulia Vernandes", "XI LPBS B"],
  ["1916", "Rafi Afdal Musyafa", "XI LPBS B"],
  ["1917", "Ragil Kesa Nurhalifah", "XI LPBS B"],
  ["1918", "Rena Ayudiani", "XI LPBS B"],
  ["1919", "Rifa Nur Safanah", "XI LPBS B"],
  ["1920", "Rina Fajria Maulida", "XI LPBS B"],
  ["1921", "Rinka Aisya Cahyani", "XI LPBS B"],
  ["1922", "Safira Adritya Putri", "XI LPBS B"],
  ["1923", "Salsabila Putri Asyifa", "XI LPBS B"],
  ["1924", "Savarotul Laela", "XI LPBS B"],
  ["1925", "Silva Aqilah Wanaziihah", "XI LPBS B"],
  ["1926", "Silvi Kireina", "XI LPBS B"],
  ["1927", "Tsalatsa Putri Istiqomah", "XI LPBS B"],
  ["1928", "Ummu Nafisah", "XI LPBS B"],

  // XI LPK3 A
  ["1755", "Alya Fitriyani", "XI LPK3 A"],
  ["1757", "Ambar Kartika", "XI LPK3 A"],
  ["1758", "Atha Octhaviana", "XI LPK3 A"],
  ["1759", "Ava Adzra Nur Azalia", "XI LPK3 A"],
  ["1760", "Ayva Nur Fatimah", "XI LPK3 A"],
  ["1761", "Dian Saputri", "XI LPK3 A"],
  ["1762", "Diana Cinta Rahmawati", "XI LPK3 A"],
  ["1763", "Dwi Aulia Lestari", "XI LPK3 A"],
  ["1764", "Dyah Meisila Rahmawati", "XI LPK3 A"],
  ["1765", "Eka Karunia Putri", "XI LPK3 A"],
  ["1767", "Fadhilatul Muna", "XI LPK3 A"],
  ["1768", "Felintang Azqhi Anandya", "XI LPK3 A"],
  ["1769", "Fika Febriana", "XI LPK3 A"],
  ["1770", "Izyan Arkan Alfalih", "XI LPK3 A"],
  ["1771", "Juli Ardyansyah", "XI LPK3 A"],
  ["1772", "Khoerin Isnawati", "XI LPK3 A"],
  ["1773", "Lathifah Andra Falina", "XI LPK3 A"],
  ["1774", "Negriana Lurita Putri", "XI LPK3 A"],
  ["1775", "Nesa Nurfadilah", "XI LPK3 A"],
  ["1776", "Nur Faiszah", "XI LPK3 A"],
  ["1777", "Revina Risti Yuliastono", "XI LPK3 A"],
  ["1778", "Riffina Nirmala Putri", "XI LPK3 A"],
  ["1779", "Rizqi Putri Fajriatul Hasanah", "XI LPK3 A"],
  ["1780", "Rosalinda Destiana Rusmawardani", "XI LPK3 A"],
  ["1781", "Safa Septiananingsih", "XI LPK3 A"],
  ["1782", "Syafira Fivti Yanuari", "XI LPK3 A"],
  ["1784", "Syfa Rahmadani", "XI LPK3 A"],
  ["1783", "Syifa Rahma Dira", "XI LPK3 A"],
  ["1785", "Talita Putri", "XI LPK3 A"],
  ["1786", "Umi Latifah", "XI LPK3 A"],
  ["1787", "Viara Nur Luthfiah", "XI LPK3 A"],
  ["1788", "Wanda Armelita Almira", "XI LPK3 A"],
  ["1789", "Zahra Roudhotun Nisa", "XI LPK3 A"],
  ["1790", "Zahra Uswatun Khasanah", "XI LPK3 A"],

  // XI LPK3 B
  ["1791", "Abiyu Nabilah", "XI LPK3 B"],
  ["1792", "Ajeng Tri Nur Oktaviya", "XI LPK3 B"],
  ["1793", "Alfiatus Surur", "XI LPK3 B"],
  ["1794", "Almira Larasati Rachim", "XI LPK3 B"],
  ["1795", "Aolia Dwi Agustin", "XI LPK3 B"],
  ["1796", "Athaullah Dhiya Ul Haq", "XI LPK3 B"],
  ["1797", "Bayu Satria Thama", "XI LPK3 B"],
  ["1798", "Chika Asriati", "XI LPK3 B"],
  ["1799", "Defina Yasifa Unisa", "XI LPK3 B"],
  ["1800", "Desmita Isna Putri", "XI LPK3 B"],
  ["1801", "Fani Windiarti", "XI LPK3 B"],
  ["1803", "Hanifah Lutfiyah", "XI LPK3 B"],
  ["1804", "Hemalia Cahya Ningtyas", "XI LPK3 B"],
  ["1805", "Ikke Nur Hafizza", "XI LPK3 B"],
  ["1806", "Intan Puspita Kharisma", "XI LPK3 B"],
  ["1807", "Izzati Rahmuna Sera", "XI LPK3 B"],
  ["1808", "Jelita Otavia", "XI LPK3 B"],
  ["1809", "Keyta Wardani", "XI LPK3 B"],
  ["1810", "Laela Fitri Rahmadani", "XI LPK3 B"],
  ["1811", "Laksmitha Lazuardi Lintanganjani", "XI LPK3 B"],
  ["1812", "Livia Ayudiaputri Ambarwati", "XI LPK3 B"],
  ["1813", "Manggita Ditali Firli", "XI LPK3 B"],
  ["1814", "Nadya Fussi Naffalia", "XI LPK3 B"],
  ["1815", "Nimas Awalia", "XI LPK3 B"],
  ["1816", "Prita Oktaviani", "XI LPK3 B"],
  ["1817", "Raihana Amira Fauziah", "XI LPK3 B"],
  ["1820", "Safira Choerunisa", "XI LPK3 B"],
  ["1821", "Silva Aulia Hayuning Tyas", "XI LPK3 B"],
  ["1822", "Tegar Abdul Nuruloh", "XI LPK3 B"],
  ["1823", "Vakhriyya Sovi Sobikha", "XI LPK3 B"],
  ["1824", "Vania Nur Amanda Putri", "XI LPK3 B"],
  ["1825", "Zaera Nurnahsya Deswita Zain", "XI LPK3 B"],

  // XI LPK3 C
  ["1828", "Amira Farah Tsalsabilla", "XI LPK3 C"],
  ["1829", "Annisa Nur Syifa", "XI LPK3 C"],
  ["1830", "Cantika Nur Salsabila", "XI LPK3 C"],
  ["1831", "Deswita Rosdiana Putri", "XI LPK3 C"],
  ["1832", "Dewi Sriani", "XI LPK3 C"],
  ["1833", "Erina Faizah", "XI LPK3 C"],
  ["1834", "Erlin Meiningrum", "XI LPK3 C"],
  ["1835", "Fadila Nur Alfisyah", "XI LPK3 C"],
  ["1836", "Fadya Ulya Sabrina", "XI LPK3 C"],
  ["1837", "Fadya Zahra Aprilia", "XI LPK3 C"],
  ["1838", "Fais Satun Khasanah", "XI LPK3 C"],
  ["1839", "Fidela Aira Kasih", "XI LPK3 C"],
  ["1840", "Fika Nur Anggraeni", "XI LPK3 C"],
  ["1841", "Fina Najua Risma", "XI LPK3 C"],
  ["1842", "Fourinita Rizki Aprillia", "XI LPK3 C"],
  ["1843", "Jesika Apriliani", "XI LPK3 C"],
  ["1844", "Keysya Keytha El Rumi", "XI LPK3 C"],
  ["1845", "Linda Fadilahni Azzahra", "XI LPK3 C"],
  ["1846", "Melindra Alisya Kirana", "XI LPK3 C"],
  ["1847", "Meriska Mei Amalliah", "XI LPK3 C"],
  ["1848", "Nadia Putri Zhahrani", "XI LPK3 C"],
  ["1849", "Naila Niya Azzahra", "XI LPK3 C"],
  ["1850", "Naura Zahra Aulia", "XI LPK3 C"],
  ["1851", "Novita Nur Khasanah", "XI LPK3 C"],
  ["1852", "Nur Rahmah Putri", "XI LPK3 C"],
  ["1853", "Nurul Alif Nabila", "XI LPK3 C"],
  ["1854", "Okta Aditya Saputra", "XI LPK3 C"],
  ["1855", "Oktafiani Nur Haliza", "XI LPK3 C"],
  ["1856", "Olivia Zahro Tussita", "XI LPK3 C"],
  ["1857", "Putri Avrilia", "XI LPK3 C"],
  ["1858", "Putri Nurjanah", "XI LPK3 C"],
  ["1859", "Ressy Rahmawati", "XI LPK3 C"],
  ["1860", "Revi Setyaningsih", "XI LPK3 C"],
  ["1861", "Shaffa Aulia Puspadewi", "XI LPK3 C"],
  ["1862", "Tahlia Syahla", "XI LPK3 C"],

  // XII LPBS
  ["1715", "Ahmed Dwi Ladita Devan", "XII LPBS"],
  ["1753", "Anggun Cahya Nur Wendah", "XII LPBS"],
  ["1716", "Annisa Zahra Nabilah", "XII LPBS"],
  ["1717", "Athifah Luthfiyana Dewi", "XII LPBS"],
  ["1718", "Ayu Nur Rizki", "XII LPBS"],
  ["1719", "Desta Alif Fiani", "XII LPBS"],
  ["1720", "Dista Ayu Lestari", "XII LPBS"],
  ["1721", "Dwi Okta Safitri", "XII LPBS"],
  ["1722", "Evelina Oktri Susanti", "XII LPBS"],
  ["1723", "Fiko Dwi Ardiansah", "XII LPBS"],
  ["1751", "Fiqi Alwi Syabana", "XII LPBS"],
  ["1724", "Fitria Eli Ambarwati", "XII LPBS"],
  ["1725", "Hana Dwi Armiati", "XII LPBS"],
  ["1726", "Hayu Naya Ramadhani", "XII LPBS"],
  ["1727", "Isna Dian Nestia", "XII LPBS"],
  ["1728", "Kayla Mira Sari", "XII LPBS"],
  ["1729", "Khoenur Fajar", "XII LPBS"],
  ["1730", "Lelli Wigati", "XII LPBS"],
  ["1731", "Mela Kallista Savalao", "XII LPBS"],
  ["1732", "Miftahul Jannah Oktafiyani", "XII LPBS"],
  ["1734", "Nadia Eka Putria", "XII LPBS"],
  ["1735", "Ndari Puji Rahayu", "XII LPBS"],
  ["1736", "Nimatul Fuadiyah", "XII LPBS"],
  ["1737", "Novi Eka Yulianti", "XII LPBS"],
  ["1738", "Nur Alfiah Isnaeni", "XII LPBS"],
  ["1754", "Nur Fitri", "XII LPBS"],
  ["1739", "Nur Sangadah", "XII LPBS"],
  ["1740", "Panggih Kurniawan", "XII LPBS"],
  ["1741", "Rayhani Safa Fadila", "XII LPBS"],
  ["1742", "Rima Maya Aolia", "XII LPBS"],
  ["1743", "Rizki Rahmat Ramadani", "XII LPBS"],
  ["1745", "Siti Nur Aini", "XII LPBS"],
  ["1747", "Vega Arumbi", "XII LPBS"],
  ["1748", "Yasyifa 'Ain Nurrahmah", "XII LPBS"],
  ["1749", "Yusuf Setiawan", "XII LPBS"],

  // XII LPK3 A
  ["1694", "Agus Tina Wulandari", "XII LPK3 A"],
  ["1695", "Alzena Zahwa Ananta", "XII LPK3 A"],
  ["1696", "Ananda Jasmine Priyanto", "XII LPK3 A"],
  ["1643", "Anisa Tri Yanuar", "XII LPK3 A"],
  ["1697", "Assafa Bintang Ardiumika", "XII LPK3 A"],
  ["1645", "Aulia Putri Nur Khasanah", "XII LPK3 A"],
  ["1646", "Ayesha Nausha Azra", "XII LPK3 A"],
  ["1672", "Azifa Viqriani Septerina Majid", "XII LPK3 A"],
  ["1673", "Ceysha Aura Nur Fatikha", "XII LPK3 A"],
  ["1698", "Cutina Firli Efendi", "XII LPK3 A"],
  ["1699", "Dava Aji Prasetyo", "XII LPK3 A"],
  ["1675", "Dhina Sholikhatun Nur Faiza", "XII LPK3 A"],
  ["1700", "Difa Putri Aulia", "XII LPK3 A"],
  ["1676", "Farhah Penta Febriani", "XII LPK3 A"],
  ["1701", "Ferawati Solikhah", "XII LPK3 A"],
  ["1677", "Fitria Dwi Akmalia", "XII LPK3 A"],
  ["1678", "Habib Afreza", "XII LPK3 A"],
  ["1679", "Icha Tri Pratistha", "XII LPK3 A"],
  ["1702", "Istika Rahmawati", "XII LPK3 A"],
  ["1680", "Juni Lia Renanda", "XII LPK3 A"],
  ["1681", "Khasna Amiratun Nisa", "XII LPK3 A"],
  ["1703", "Khoirunisa Salsabila Rahmawati", "XII LPK3 A"],
  ["1704", "Kirana Putri Arinda", "XII LPK3 A"],
  ["1705", "Nabila Asifatun Nikmah", "XII LPK3 A"],
  ["1685", "Oktavia Nur Rizki", "XII LPK3 A"],
  ["1708", "Putri Dwi Agustin", "XII LPK3 A"],
  ["1656", "Rafillah Akbar At Thaariq", "XII LPK3 A"],
  ["1657", "Refika Ariesta", "XII LPK3 A"],
  ["1710", "Rian Bayu Pradana", "XII LPK3 A"],
  ["1687", "Rizka Nur Rohmah", "XII LPK3 A"],
  ["1658", "Sasmitha Novaliandra", "XII LPK3 A"],
  ["1659", "Selfa Dian Munjiniati", "XII LPK3 A"],
  ["1660", "Sinta Della", "XII LPK3 A"],
  ["1713", "Verina Dwi Erdina", "XII LPK3 A"],
  ["1662", "Wafik Azizah", "XII LPK3 A"],
  ["1693", "Ziyada Nur Adzkiya", "XII LPK3 A"],

  // XII LPK3 B
  ["1640", "Adinda Afifah Nurazizah", "XII LPK3 B"],
  ["1666", "Adji Abimanyu Baahir", "XII LPK3 B"],
  ["1667", "Agnis Frisma Utari", "XII LPK3 B"],
  ["1668", "Alfiz Al Hariz", "XII LPK3 B"],
  ["1641", "Ana Fu'Ani Farkhatun", "XII LPK3 B"],
  ["1642", "Anastasya Ayu Fajrina", "XII LPK3 B"],
  ["1669", "Ariyanti Kristin", "XII LPK3 B"],
  ["1670", "Ashifa Aura Putri Na'Yoan", "XII LPK3 B"],
  ["1671", "Aulia Latifatuljannah Sifa", "XII LPK3 B"],
  ["1750", "Bayu Rizky Pratama", "XII LPK3 B"],
  ["1929", "Bilqisthy Talita Sakhi", "XII LPK3 B"],
  ["1647", "Deka Arinta Nur Insani", "XII LPK3 B"],
  ["1649", "Fahda Fitratun Nufus", "XII LPK3 B"],
  ["1650", "Givella Ananda Zahrotussita", "XII LPK3 B"],
  ["1651", "Khaliisha Mahfuudzah", "XII LPK3 B"],
  ["1652", "Maya Nur Fadhilah", "XII LPK3 B"],
  ["1682", "Meyka Wafik Rahma Wastina", "XII LPK3 B"],
  ["1653", "Nabila Amelia Hasan", "XII LPK3 B"],
  ["1683", "Nabila Frescha Aurera", "XII LPK3 B"],
  ["1706", "Nabila Tazkiya Mumtaza", "XII LPK3 B"],
  ["1654", "Nadine Natalie Ayu", "XII LPK3 B"],
  ["1684", "Nasya Ayudia Septiana", "XII LPK3 B"],
  ["1707", "Nasywa Kamila Ramadhani", "XII LPK3 B"],
  ["1655", "Nayla Ma'Rifatul Azqi", "XII LPK3 B"],
  ["1711", "Sabrina Ayu Azzahra", "XII LPK3 B"],
  ["1688", "Salsa Ngizaturrahmah", "XII LPK3 B"],
  ["1689", "Sifa Umu Salamah", "XII LPK3 B"],
  ["1690", "Syiva Triyumi Anjaniar", "XII LPK3 B"],
  ["1712", "Tectona Grandis Suroso", "XII LPK3 B"],
  ["1691", "Titik Amalia Nevada", "XII LPK3 B"],
  ["1661", "Ulfatum Muniroh", "XII LPK3 B"],
  ["1692", "Umi Aulia Khasanah", "XII LPK3 B"],
  ["1663", "Wahyu Putra Pratama", "XII LPK3 B"],
  ["1665", "Ziza Aulia Putri", "XII LPK3 B"],
  ["1714", "Zulcarisa Maharani", "XII LPK3 B"],
];

function padNis(nis) {
  return nis.padStart(6, "0");
}

function makeEmail(nis) {
  return `${nis}@siswa.smk3.sch.id`;
}

async function main() {
  console.log("=== Create Bulk Siswa Accounts ===\n");

  // 1. Create classes
  console.log("--- Membuat kelas ---");
  const classMap = {};
  for (const def of classDefs) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("name", def.name)
      .maybeSingle();

    if (existing) {
      console.log(`  📁 ${def.name} (sudah ada)`);
      classMap[def.name] = existing.id;
    } else {
      const { data, error } = await supabase
        .from("classes")
        .insert(def)
        .select("id")
        .single();

      if (error) {
        console.error(`  ❌ Gagal buat kelas ${def.name}: ${error.message}`);
        process.exit(1);
      }
      console.log(`  ✅ ${def.name} (ID: ${data.id})`);
      classMap[def.name] = data.id;
    }
  }

  // 2. Create student accounts
  console.log("\n--- Membuat akun siswa ---");
  const results = [];

  for (let i = 0; i < studentData.length; i++) {
    const [nis, name, className] = studentData[i];
    const email = makeEmail(nis);
    const password = padNis(nis);
    const classId = classMap[className];
    const barcode = "SIS" + nis;

    if (!classId) {
      console.log(`[${String(i + 1).padStart(3, "0")}] ❌ ${name}: Kelas ${className} tidak ditemukan`);
      results.push({ nis, name, status: "gagal", error: "Kelas tidak ditemukan" });
      continue;
    }

    try {
      const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: "siswa" },
      });

      if (createError) {
        console.log(`[${String(i + 1).padStart(3, "0")}] ❌ ${name} (${nis}): ${createError.message}`);
        results.push({ nis, name, status: "gagal", error: createError.message });
        continue;
      }

      const userId = user.user.id;

      const { error: insertUserError } = await supabase.from("users").insert({
        id: userId,
        email,
        name,
        role: "siswa",
      });

      if (insertUserError) {
        console.log(`[${String(i + 1).padStart(3, "0")}] ❌ ${name} (${nis}): Gagal insert users: ${insertUserError.message}`);
        results.push({ nis, name, status: "gagal", error: insertUserError.message });
        continue;
      }

      const { error: insertStudentError } = await supabase.from("students").insert({
        id: userId,
        nis,
        name,
        class_id: classId,
        email,
        status: "active",
        barcode,
      });

      if (insertStudentError) {
        console.log(`[${String(i + 1).padStart(3, "0")}] ❌ ${name} (${nis}): Gagal insert students: ${insertStudentError.message}`);
        results.push({ nis, name, status: "gagal", error: insertStudentError.message });
        continue;
      }

      console.log(`[${String(i + 1).padStart(3, "0")}] ✅ ${name} (${nis}) → ${className}`);
      results.push({ nis, name, status: "berhasil" });
    } catch (err) {
      console.log(`[${String(i + 1).padStart(3, "0")}] ❌ ${name} (${nis}): ${err.message}`);
      results.push({ nis, name, status: "gagal", error: err.message });
    }
  }

  // 3. Summary
  console.log("\n=== RINGKASAN ===");
  const sukses = results.filter((r) => r.status === "berhasil").length;
  const gagal = results.filter((r) => r.status === "gagal").length;
  console.log(`Total: ${results.length} | Berhasil: ${sukses} | Gagal: ${gagal}`);

  if (gagal > 0) {
    console.log("\nDaftar gagal:");
    results.filter((r) => r.status === "gagal").forEach((r) => {
      console.log(`  - ${r.name} (${r.nis}): ${r.error}`);
    });
  }
}

main().catch(console.error);
