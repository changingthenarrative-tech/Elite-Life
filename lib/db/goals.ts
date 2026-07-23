import type { SupabaseClient } from "@supabase/supabase-js";

export interface Goal {
  id: string;
  title: string;
  detail: string | null;
  kind: "goal" | "project";
  status: "active" | "stalled" | "done";
  targetDate: string | null;
}

export async function listGoals(
  supabase: SupabaseClient,
  userId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Goal[]> {
  let query = supabase
    .from("goals")
    .select("id, title, detail, kind, status, target_date")
    .eq("user_id", userId);

  if (opts.activeOnly) {
    query = query.in("status", ["active", "stalled"]);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load goals: ${error.message}`);
  }

  return (data ?? []).map((g) => ({
    id: g.id as string,
    title: g.title as string,
    detail: (g.detail as string | null) ?? null,
    kind: g.kind as Goal["kind"],
    status: g.status as Goal["status"],
    targetDate: (g.target_date as string | null) ?? null,
  }));
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  args: {
    title: string;
    detail?: string;
    kind?: "goal" | "project";
    targetDate?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: args.title,
    detail: args.detail ?? null,
    kind: args.kind ?? "goal",
    target_date: args.targetDate || null,
  });

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }
}

export async function updateGoalStatus(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  status: Goal["status"],
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update goal: ${error.message}`);
  }
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete goal: ${error.message}`);
  }
}
