export const ATTENDANCE_LABELS: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  sakit: "Sakit",
  izin: "Izin",
  dispen: "Dispen",
  alpa: "Alpa",
  pulang: "Pulang",
};

export const ATTENDANCE_BADGE_CLASSES: Record<string, string> = {
  hadir: "bg-green-100 text-green-600",
  terlambat: "bg-amber-100 text-amber-600",
  sakit: "bg-blue-100 text-blue-600",
  izin: "bg-purple-100 text-purple-600",
  dispen: "bg-sky-100 text-sky-600",
  alpa: "bg-red-100 text-red-600",
  pulang: "bg-green-100 text-green-600",
};

export type AttendanceInfo = {
  masuk_status?: string | null;
  late_status?: string | null;
};

/** Status masuk final: 'terlambat' disimpan sebagai late_status, bukan masuk_status. */
export function resolveMasukStatus(info: AttendanceInfo): string | null {
  if (!info.masuk_status) return null;
  if (info.masuk_status === "hadir" && info.late_status === "terlambat") return "terlambat";
  return info.masuk_status;
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Belum";
  return ATTENDANCE_LABELS[status] || status;
}

export function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return "bg-gray-100 text-gray-500";
  return ATTENDANCE_BADGE_CLASSES[status] || "bg-gray-100 text-gray-500";
}
