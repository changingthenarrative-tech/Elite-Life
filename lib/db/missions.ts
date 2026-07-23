import type { SupabaseClient } from "@supabase/supabase-js";

export interface Mission {
  mission: string;
  completed: boolean;
}

export async function getMissionForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<Mission | null> {
  const { data, error } = await supabase
    .from("daily_missions")
    .select("mission, completed")
    .eq("user_id", userId)
    .eq("mission_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load mission: ${error.message}`);
  }
  if (!data) return null;

  return { mission: data.mission as string, completed: data.completed as boolean };
}

export async function setMission(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  mission: string,
): Promise<void> {
  const { error } = await supabase
    .from("daily_missions")
    .upsert(
      { user_id: userId, mission_date: date, mission },
      { onConflict: "user_id,mission_date" },
    );

  if (error) {
    throw new Error(`Failed to set mission: ${error.message}`);
  }
}

export async function setCompletion(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("daily_missions")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("user_id", userId)
    .eq("mission_date", date);

  if (error) {
    throw new Error(`Failed to update mission: ${error.message}`);
  }
}

function ymd(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export async function getStreak(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("daily_missions")
    .select("mission_date")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("mission_date", { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(`Failed to compute streak: ${error.message}`);
  }

  const done = new Set((data ?? []).map((r) => r.mission_date as string));
  const cursor = new Date(today + "T00:00:00");
  if (!done.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (done.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
