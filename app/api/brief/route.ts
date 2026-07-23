import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestBriefSince } from "@/lib/db/briefs";
import { generateAndSaveBrief } from "@/lib/features/generate-daily-brief";

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

  let body;
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
    const { brief, eventCount, emailCount } = await generateAndSaveBrief({
      supabase,
      userId: user.id,
      providerToken,
      timeMin,
      timeMax,
      timezone,
    });

    return NextResponse.json({
      brief,
      eventCount,
      emailCount,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate the brief.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
