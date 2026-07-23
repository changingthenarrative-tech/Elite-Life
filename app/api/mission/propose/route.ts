import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodaysEvents } from "@/lib/integrations/google/calendar";
import { getUnreadHighlights } from "@/lib/integrations/google/gmail";
import {
  assembleContext,
  renderContextForModel,
} from "@/lib/ai/context-assembler";
import { getStreak } from "@/lib/db/missions";
import { proposeMission } from "@/lib/ai/mission";
import { listGoals } from "@/lib/db/goals";

// Propose today's mission from the full assembled context (calendar + inbox)
// plus the user's recent execution history. Returns a proposal to accept/edit;
// it does NOT save — the user sets it explicitly.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    providerToken?: string;
    timeMin?: string;
    timeMax?: string;
    timezone?: string;
    date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { providerToken, timeMin, timeMax, timezone, date } = body;
  if (!providerToken) {
    return NextResponse.json(
      { error: "Missing Google authorization. Please sign in again." },
      { status: 400 },
    );
  }
  if (!timeMin || !timeMax || !timezone || !date) {
    return NextResponse.json({ error: "Missing day range." }, { status: 400 });
  }

  try {
    const [events, emails] = await Promise.all([
      getTodaysEvents(providerToken, timeMin, timeMax),
      getUnreadHighlights(providerToken),
    ]);

    // Read the shared context-assembler seam — the same one every feature uses.
    const context = assembleContext(
      { events, emails },
      { date: timeMin, timezone },
    );
    const renderedContext = renderContextForModel(context);

    // Fold in the user's recent execution.
    const streak = await getStreak(supabase, user.id, date);
    const { data: recent } = await supabase
      .from("daily_missions")
      .select("mission_date, mission, completed")
      .eq("user_id", user.id)
      .order("mission_date", { ascending: false })
      .limit(7);

    const lines = (recent ?? []).map(
      (r) =>
        "- " +
        r.mission_date +
        ": " +
        (r.completed ? "done" : "missed") +
        " — " +
        r.mission,
    );
    const executionSummary =
      "Current streak: " +
      streak +
      " day" +
      (streak === 1 ? "" : "s") +
      ".\n" +
      (lines.length ? lines.join("\n") : "No recent missions on record.");

    const { mission } = await proposeMission({
      renderedContext,
      executionSummary,
    });

    return NextResponse.json({ mission });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to propose a mission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
