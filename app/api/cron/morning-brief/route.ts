import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listBriefRecipients, markBriefGenerated } from "@/lib/db/integrations";
import { getAccessTokenFromRefreshToken } from "@/lib/integrations/google/oauth";
import {
  generateAndSaveBrief,
  dayBoundsInTimezone,
} from "@/lib/features/generate-daily-brief";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Service client error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const results: { userId: string; status: string; detail?: string }[] = [];

  try {
    const recipients = await listBriefRecipients(supabase);

    for (const r of recipients) {
      if (!r.googleRefreshToken) continue;

      const { timeMin, timeMax, localDate } = dayBoundsInTimezone(r.timezone);

      if (r.lastBriefDate === localDate) {
        results.push({ userId: r.userId, status: "skipped (already sent)" });
        continue;
      }

      try {
        const accessToken = await getAccessTokenFromRefreshToken(
          r.googleRefreshToken,
        );

        await generateAndSaveBrief({
          supabase,
          userId: r.userId,
          providerToken: accessToken,
          timeMin,
          timeMax,
          timezone: r.timezone,
        });

        await markBriefGenerated(supabase, r.userId, localDate);
        results.push({ userId: r.userId, status: "generated" });
      } catch (err) {
        results.push({
          userId: r.userId,
          status: "failed",
          detail: err instanceof Error ? err.message : "unknown error",
        });
      }
    }

    return NextResponse.json({ ran: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
