const SCHOOL_LAT = -7.4212;
const SCHOOL_LNG = 109.4418;
const RADIUS_METERS = 100;

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

export function isWithinSchool(
  lat: number,
  lng: number,
  schoolLat?: number,
  schoolLng?: number,
  radius?: number
): boolean {
  const refLat = schoolLat ?? SCHOOL_LAT;
  const refLng = schoolLng ?? SCHOOL_LNG;
  const refRadius = radius ?? RADIUS_METERS;
  const distance = getDistanceInMeters(lat, lng, refLat, refLng);
  return distance <= refRadius;
}

export type GPSResult =
  | { success: true; lat: number; lng: number }
  | { success: false; error: "timeout" | "denied" | "unavailable" };

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

export async function getCurrentPosition(): Promise<GPSResult> {
  if (!navigator.geolocation) {
    return { success: false, error: "unavailable" };
  }

  // Attempt 1: high accuracy, 20s timeout
  const pos1 = await getPosition({
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 300000,
  });

  if (pos1) {
    return {
      success: true,
      lat: pos1.coords.latitude,
      lng: pos1.coords.longitude,
    };
  }

  // Attempt 2 (fallback): low accuracy (WiFi/net), 10s timeout
  const pos2 = await getPosition({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000,
  });

  if (pos2) {
    return {
      success: true,
      lat: pos2.coords.latitude,
      lng: pos2.coords.longitude,
    };
  }

  // Both attempts failed — try to determine reason
  // We can't access the error object from our wrapper, so we do one more
  // attempt with an error callback to get the error code
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ success: false, error: "unavailable" }),
      (err) => {
        if (err.code === err.TIMEOUT) resolve({ success: false, error: "timeout" });
        else if (err.code === err.PERMISSION_DENIED) resolve({ success: false, error: "denied" });
        else resolve({ success: false, error: "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  });
}

export function getGPSErrorMessage(error: "timeout" | "denied" | "unavailable"): string {
  switch (error) {
    case "timeout":
      return "Sinyal GPS lemah. Coba di luar ruangan atau tekan Coba Lagi.";
    case "denied":
      return "Izinkan akses lokasi di pengaturan browser/perangkat Anda.";
    case "unavailable":
      return "GPS belum aktif. Aktifkan GPS di perangkat Anda.";
  }
}
