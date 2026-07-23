import type { SupabaseClient } from "@supabase/supabase-js";
import type { Brief } from "@/lib/ai/brief";

export async function saveBrief(
  supabase: SupabaseClient,
  args: {
    userId: string;
    content: Brief;
    aiInput: string;
    aiOutput: string;
    model: string;
  },
): Promise<void> {
  const { error } = await supabase.from("daily_briefs").insert({
    user_id: args.userId,
    content: args.content,
    ai_input: args.aiInput,
    ai_output: args.aiOutput,
    model: args.model,
  });

  if (error) {
    throw new Error(`Failed to save brief: ${error.message}`);
  }
}

export interface StoredBrief {
  content: Brief;
  generatedAt: string;
}

// Returns the most recent brief generated at or after `sinceIso`
// (i.e. today, in the user's local timezone), or null if there isn't one yet.
export async function getLatestBriefSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
): Promise<StoredBrief | null> {
  const { data, error } = await supabase
    .from("daily_briefs")
    .select("content, generated_at")
    .eq("user_id", userId)
    .gte("generated_at", sinceIso)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load brief: ${error.message}`);
  }
  if (!data) return null;

  return {
    content: data.content as Brief,
    generatedAt: data.generated_at as string,
  };
}