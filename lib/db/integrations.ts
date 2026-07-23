import type { SupabaseClient } from "@supabase/supabase-js";

export interface IntegrationRow {
  userId: string;
  googleRefreshToken: string | null;
  timezone: string;
  briefEnabled: boolean;
  lastBriefDate: string | null;
}

export async function saveGoogleRefreshToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
  timezone: string,
): Promise<void> {
  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      google_refresh_token: refreshToken,
      timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error("Failed to save integration: " + error.message);
  }
}

export async function listBriefRecipients(
  supabase: SupabaseClient,
): Promise<IntegrationRow[]> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select(
      "user_id, google_refresh_token, timezone, brief_enabled, last_brief_date",
    )
    .eq("brief_enabled", true)
    .not("google_refresh_token", "is", null);

  if (error) {
    throw new Error("Failed to list recipients: " + error.message);
  }

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    googleRefreshToken: (r.google_refresh_token as string | null) ?? null,
    timezone: (r.timezone as string) ?? "UTC",
    briefEnabled: r.brief_enabled as boolean,
    lastBriefDate: (r.last_brief_date as string | null) ?? null,
  }));
}

export async function markBriefGenerated(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  await supabase
    .from("user_integrations")
    .update({ last_brief_date: date, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
