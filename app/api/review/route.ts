import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodaysEvents } from "@/lib/integrations/google/calendar";
import { generateReview } from "@/lib/ai/review";
import { saveReview, getLatestReviewSince } from "@/lib/db/reviews";
import { getLatestBriefSince } from "@/lib/db/briefs";
import { listGoals } from "@/lib/db/goals";
import { getMissionForDate } from "@/lib/db/missions";

// Load today's saved review (if one exists) so the page can show it on open.
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
    const stored = await getLatestReviewSince(supabase, user.id, since);
    if (!stored) {
      return NextResponse.json({ review: null });
    }
    return NextResponse.json({
      review: stored.content,
      generatedAt: stored.generatedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load the review.";
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
    reflection?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { providerToken, timeMin, timeMax, timezone, reflection } = body;

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
    const localDate = new Date(timeMin).toISOString().slice(0, 10);
    const [events, goals, mission] = await Promise.all([
      getTodaysEvents(providerToken, timeMin, timeMax),
      listGoals(supabase, user.id, { activeOnly: true }),
      getMissionForDate(supabase, user.id, localDate),
    ]);

    // Anchor the review on this morning's focus, if a brief exists for today.
    const morningBrief = await getLatestBriefSince(supabase, user.id, timeMin);
    const morningFocus = morningBrief?.content.oneThing ?? null;

    const { review, raw, input, model } = await generateReview({
      date: timeMin,
      timezone,
      events,
      morningFocus,
      reflection: reflection ?? "",
      goals,
      missionText: mission?.mission ?? null,
      missionCompleted: mission ? mission.completed : null,
    });

    await saveReview(supabase, {
      userId: user.id,
      content: review,
      userReflection: reflection ?? "",
      aiInput: input,
      aiOutput: raw,
      model,
    });

    return NextResponse.json({
      review,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate the review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
