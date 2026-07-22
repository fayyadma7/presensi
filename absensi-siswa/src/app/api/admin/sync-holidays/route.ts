import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TALLYFY_API = "https://tallyfy.com/national-holidays/api/ID";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  if (!year) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch from Tallyfy API
  let apiHolidays: { date: string; name: string; local_name: string }[] = [];
  try {
    const res = await fetch(`${TALLYFY_API}/${year}.json`);
    if (res.ok) {
      const data = await res.json();
      apiHolidays = data.holidays || [];
    }
  } catch {
    // API failed
  }

  // 2. Get existing dates from DB
  const { data: existing } = await supabase
    .from("holidays")
    .select("date")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);

  const existingDates = new Set((existing || []).map((h: { date: string }) => h.date));

  // 3. Upsert API holidays that don't exist yet
  const toInsert = apiHolidays
    .filter((h) => !existingDates.has(h.date))
    .map((h) => ({ date: h.date, name: h.local_name || h.name, source: "api" as const }));

  if (toInsert.length > 0) {
    await supabase.from("holidays").upsert(toInsert, { onConflict: "date" });
  }

  // 4. Return all holidays for this year
  const { data: allHolidays } = await supabase
    .from("holidays")
    .select("id, date, name, source")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date");

  return NextResponse.json({ holidays: allHolidays || [], synced: toInsert.length });
}
