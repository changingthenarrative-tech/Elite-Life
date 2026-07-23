import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/lib/ai/review";

export async function saveReview(
  supabase: SupabaseClient,
  args: {
    userId: string;
    content: Review;
    userReflection: string;
    aiInput: string;
    aiOutput: string;
    model: string;
  },
): Promise<void> {
  const { error } = await supabase.from("daily_reviews").insert({
    user_id: args.userId,
    content: args.content,
    user_reflection: args.userReflection,
    ai_input: args.aiInput,
    ai_output: args.aiOutput,
    model: args.model,
  });

  if (error) {
    throw new Error(`Failed to save review: ${error.message}`);
  }
}

export interface StoredReview {
  content: Review;
  generatedAt: string;
}

export async function getLatestReviewSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
): Promise<StoredReview | null> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .select("content, generated_at")
    .eq("user_id", userId)
    .gte("generated_at", sinceIso)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load review: ${error.message}`);
  }
  if (!data) return null;

  return {
    content: data.content as Review,
    generatedAt: data.generated_at as string,
  };
}
