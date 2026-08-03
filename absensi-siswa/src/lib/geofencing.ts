const SCHOOL_LAT = -7.413197;
const SCHOOL_LNG = 109.375983;
const RADIUS_METERS = 150;

// Fix GPS dengan akurasi lebih buruk dari ini dianggap tidak dapat
// dipercaya untuk validasi geofence (mis. hasil triangulasi tower seluler).
const MAX_RELIABLE_ACCURACY = 100;
// Toleransi akurasi yang ditambahkan ke radius geofence, dibatasi agar
// radius efektif tidak membesar berlebihan.
const ACCURACY_MARGIN_CAP = 75;

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cek apakah posisi berada di dalam area sekolah.
 * `accuracy` (opsional) = ketidakpastian fix GPS dalam meter; ditambahkan
 * ke radius sebagai toleransi agar siswa di dalam gedung tidak keliru
 * dianggap berada di luar sekolah.
 */
export function isWithinSchool(
  lat: number,
  lng: number,
  schoolLat?: number,
  schoolLng?: number,
  radius?: number,
  accuracy?: number
): boolean {
  const refLat = schoolLat ?? SCHOOL_LAT;
  const refLng = schoolLng ?? SCHOOL_LNG;
  const refRadius = radius ?? RADIUS_METERS;
  const distance = getDistanceInMeters(lat, lng, refLat, refLng);
  const margin =
    accuracy != null && Number.isFinite(accuracy) && accuracy > 0
      ? Math.min(accuracy, ACCURACY_MARGIN_CAP)
      : 0;
  return distance <= refRadius + margin;
}

export type GPSResult =
  | { success: true; lat: number; lng: number; accuracy: number }
  | { success: false; error: "timeout" | "denied" | "unavailable" | "weak" };

function getPosition(options: PositionOptions): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      options
    );
  });
}

function hasReliableAccuracy(position: GeolocationPosition | null): boolean {
  return (
    position != null &&
    Number.isFinite(position.coords.accuracy) &&
    position.coords.accuracy <= MAX_RELIABLE_ACCURACY
  );
}

export async function getCurrentPosition(): Promise<GPSResult> {
  if (!navigator.geolocation) {
    return { success: false, error: "unavailable" };
  }

  const highAccuracyOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
  };

  // Percobaan 1: GPS satelit berakurasi tinggi.
  const pos1 = await getPosition(highAccuracyOptions);
  if (pos1 && hasReliableAccuracy(pos1)) {
    return {
      success: true,
      lat: pos1.coords.latitude,
      lng: pos1.coords.longitude,
      accuracy: pos1.coords.accuracy,
    };
  }

  // Percobaan 2: ulangi akurasi tinggi. Fix pertama di sebagian perangkat
  // sering berakurasi rendah sebelum satelit terkunci penuh.
  const pos2 = await getPosition(highAccuracyOptions);
  if (pos2 && hasReliableAccuracy(pos2)) {
    return {
      success: true,
      lat: pos2.coords.latitude,
      lng: pos2.coords.longitude,
      accuracy: pos2.coords.accuracy,
    };
  }

  // Percobaan 3 (fallback): posisi WiFi/jaringan. Diterima hanya bila
  // akurasinya masih layak, supaya posisi dari tower seluler (yang bisa
  // meleset ratusan meter) tidak lolos sebagai lokasi valid.
  const pos3 = await getPosition({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 60000,
  });
  if (pos3 && hasReliableAccuracy(pos3)) {
    return {
      success: true,
      lat: pos3.coords.latitude,
      lng: pos3.coords.longitude,
      accuracy: pos3.coords.accuracy,
    };
  }

  // Ada fix tapi akurasinya buruk → sinyal lemah / lokasi tidak dapat dipercaya.
  if (pos1 || pos2 || pos3) {
    return { success: false, error: "weak" };
  }

  // Semua percobaan gagal — tentukan alasannya dari kode error.
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ success: false, error: "weak" }),
      (err) => {
        if (err.code === err.TIMEOUT) resolve({ success: false, error: "timeout" });
        else if (err.code === err.PERMISSION_DENIED) resolve({ success: false, error: "denied" });
        else resolve({ success: false, error: "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });
}

export function getGPSErrorMessage(error: "timeout" | "denied" | "unavailable" | "weak"): string {
  switch (error) {
    case "timeout":
    case "weak":
      return "Sinyal GPS lemah. Coba di luar ruangan atau tekan Coba Lagi.";
    case "denied":
      return "Izinkan akses lokasi di pengaturan browser/perangkat Anda.";
    case "unavailable":
      return "GPS belum aktif. Aktifkan GPS di perangkat Anda.";
  }
}
