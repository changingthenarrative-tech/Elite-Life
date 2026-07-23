import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodaysEvents } from "@/lib/integrations/google/calendar";
import { getUnreadHighlights } from "@/lib/integrations/google/gmail";
import { assembleContext } from "@/lib/ai/context-assembler";
import { generateBrief } from "@/lib/ai/brief";
import { saveBrief, getLatestBriefSince } from "@/lib/db/briefs";
import { listGoals } from "@/lib/db/goals";

// Load today's saved brief (if one exists) so the page can show it on open.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  if (!since) {
    return NextResponse.json({ error: "Missing day start." }, { status: 400 });
  }

  try {
    const stored = await getLatestBriefSince(supabase, user.id, since);
    if (!stored) {
      return NextResponse.json({ brief: null });
    }
    return NextResponse.json({
      brief: stored.content,
      generatedAt: stored.generatedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load the brief.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { providerToken, timeMin, timeMax, timezone } = body;

  if (!providerToken) {
    return NextResponse.json(
      { error: "Missing Google authorization. Please sign in again." },
      { status: 400 },
    );
  }
  if (!timeMin || !timeMax || !timezone) {
    return NextResponse.json({ error: "Missing day range." }, { status: 400 });
  }

  try {
    const [events, emails, goals] = await Promise.all([
      getTodaysEvents(providerToken, timeMin, timeMax),
      getUnreadHighlights(providerToken),
      listGoals(supabase, user.id, { activeOnly: true }),
    ]);

    const context = assembleContext(
      { events, emails, goals },
      { date: timeMin, timezone },
    );
    const { brief, raw, input, model } = await generateBrief(context);

    await saveBrief(supabase, {
      userId: user.id,
      content: brief,
      aiInput: input,
      aiOutput: raw,
      model,
    });

    return NextResponse.json({
      brief,
      eventCount: events.length,
      emailCount: emails.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate the brief.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
