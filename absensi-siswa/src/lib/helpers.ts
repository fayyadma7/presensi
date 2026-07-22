export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatDateLocal(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}

export function isSchoolDay(dateStr: string, holidays: string[]): boolean {
  return !isWeekend(dateStr) && !isHoliday(dateStr, holidays);
}

export function countSchoolDays(startDate: string, endDate: string, holidays: string[]): number {
  let count = 0;
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (current <= end) {
    const ds = formatDateLocal(current);
    if (isSchoolDay(ds, holidays)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function getPrevSchoolDays(n: number, holidays: string[]): string[] {
  const result: string[] = [];
  const d = new Date();
  while (result.length < n) {
    const ds = formatDateLocal(d);
    if (isSchoolDay(ds, holidays)) result.unshift(ds);
    d.setDate(d.getDate() - 1);
  }
  return result;
}

export function isTodaySchoolDay(holidays: string[]): boolean {
  const today = formatDateLocal();
  return isSchoolDay(today, holidays);
}
