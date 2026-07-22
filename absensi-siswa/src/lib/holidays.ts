import { createClient } from "@/lib/supabase/client";

export async function syncHolidaysToDB(year: number): Promise<void> {
  try {
    await fetch(`/api/admin/sync-holidays?year=${year}`);
  } catch {
    // sync failed, continue with whatever is in DB
  }
}

export async function fetchHolidays(year: number): Promise<string[]> {
  const supabase = createClient();

  await syncHolidaysToDB(year);

  const { data } = await supabase
    .from("holidays")
    .select("date")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);

  return (data || []).map((h: { date: string }) => h.date);
}

export async function getHolidayName(dateStr: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("holidays")
    .select("name")
    .eq("date", dateStr)
    .maybeSingle();
  return data?.name || null;
}
