const SCHOOL_LAT = -7.413197;
const SCHOOL_LNG = 109.375983;
const RADIUS_METERS = 150;

// Fix GPS dengan akurasi lebih buruk dari ini dianggap tidak dapat
// dipercaya untuk validasi geofence (mis. hasil triangulasi tower seluler).
const MAX_RELIABLE_ACCURACY = 250;
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

function hasReliableAccuracy(position: GeolocationPosition | null): boolean {
  return (
    position != null &&
    Number.isFinite(position.coords.accuracy) &&
    position.coords.accuracy <= MAX_RELIABLE_ACCURACY
  );
}

export function getCurrentPosition(): Promise<GPSResult> {
  if (!navigator.geolocation) {
    return Promise.resolve({ success: false, error: "unavailable" });
  }

  return new Promise((resolve) => {
    let watchId: number;
    let timeoutId: number;
    let bestPosition: GeolocationPosition | null = null;
    let hasReturned = false;

    const cleanup = () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    const finish = (result: GPSResult) => {
      if (hasReturned) return;
      hasReturned = true;
      cleanup();
      resolve(result);
    };

    timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        if (hasReliableAccuracy(bestPosition)) {
          finish({
            success: true,
            lat: bestPosition.coords.latitude,
            lng: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy,
          });
        } else {
          finish({ success: false, error: "weak" });
        }
      } else {
        finish({ success: false, error: "timeout" });
      }
    }, 15000); // Batas maksimum pencarian 15 detik

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Simpan posisi dengan akurasi terbaik sejauh ini
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        // Jika akurasi sudah memenuhi syarat, langsung kembalikan hasilnya
        if (hasReliableAccuracy(position)) {
          finish({
            success: true,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        }
      },
      (err) => {
        // Jika belum ada posisi dan akses ditolak, langsung error
        if (!bestPosition && err.code === err.PERMISSION_DENIED) {
          finish({ success: false, error: "denied" });
        }
      },
      {
        enableHighAccuracy: true, // Paksa GPS hardware nyala
        maximumAge: 0, // Jangan pakai cache sama sekali, minta data baru
        timeout: 10000,
      }
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
