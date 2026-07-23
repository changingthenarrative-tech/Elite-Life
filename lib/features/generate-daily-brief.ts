import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodaysEvents } from "@/lib/integrations/google/calendar";
import { getUnreadHighlights } from "@/lib/integrations/google/gmail";
import { assembleContext } from "@/lib/ai/context-assembler";
import { generateBrief, type Brief } from "@/lib/ai/brief";
import { saveBrief } from "@/lib/db/briefs";
import { listGoals } from "@/lib/db/goals";

export async function generateAndSaveBrief(args: {
  supabase: SupabaseClient;
  userId: string;
  providerToken: string;
  timeMin: string;
  timeMax: string;
  timezone: string;
}): Promise<{ brief: Brief; eventCount: number; emailCount: number }> {
  const { supabase, userId, providerToken, timeMin, timeMax, timezone } = args;

  const [events, emails, goals] = await Promise.all([
    getTodaysEvents(providerToken, timeMin, timeMax),
    getUnreadHighlights(providerToken),
    listGoals(supabase, userId, { activeOnly: true }),
  ]);

  const context = assembleContext(
    { events, emails, goals },
    { date: timeMin, timezone },
  );

  const { brief, raw, input, model } = await generateBrief(context);

  await saveBrief(supabase, {
    userId,
    content: brief,
    aiInput: input,
    aiOutput: raw,
    model,
  });

  return { brief, eventCount: events.length, emailCount: emails.length };
}

export function dayBoundsInTimezone(timezone: string): {
  timeMin: string;
  timeMax: string;
  localDate: string;
} {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  const localDate = get("year") + "-" + get("month") + "-" + get("day");

  const tzNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const utcNow = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = tzNow.getTime() - utcNow.getTime();

  const startLocalMidnightUtc = new Date(
    new Date(localDate + "T00:00:00Z").getTime() - offsetMs,
  );
  const endLocalMidnightUtc = new Date(
    startLocalMidnightUtc.getTime() + 24 * 60 * 60 * 1000,
  );

  return {
    timeMin: startLocalMidnightUtc.toISOString(),
    timeMax: endLocalMidnightUtc.toISOString(),
    localDate,
  };
}
