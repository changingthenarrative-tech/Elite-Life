import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getMissionForDate,
  setMission,
  setCompletion,
  getStreak,
} from "@/lib/db/missions";
import { getLatestBriefSince } from "@/lib/db/briefs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const since = searchParams.get("since");
  if (!date) {
    return NextResponse.json({ error: "Missing date." }, { status: 400 });
  }

  try {
    const mission = await getMissionForDate(supabase, user.id, date);
    const streak = await getStreak(supabase, user.id, date);

    let suggested = null;
    if (!mission && since) {
      const brief = await getLatestBriefSince(supabase, user.id, since);
      suggested = brief?.content.oneThing ?? null;
    }

    return NextResponse.json({ mission, streak, suggested });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load the mission.";
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

  const { date, mission } = body;
  if (!date || !mission || !mission.trim()) {
    return NextResponse.json(
      { error: "A date and a mission are required." },
      { status: 400 },
    );
  }

  try {
    await setMission(supabase, user.id, date, mission.trim());
    const saved = await getMissionForDate(supabase, user.id, date);
    const streak = await getStreak(supabase, user.id, date);
    return NextResponse.json({ mission: saved, streak });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to set the mission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

  const { date, completed } = body;
  if (!date || typeof completed !== "boolean") {
    return NextResponse.json(
      { error: "A date and completion state are required." },
      { status: 400 },
    );
  }

  try {
    await setCompletion(supabase, user.id, date, completed);
    const streak = await getStreak(supabase, user.id, date);
    return NextResponse.json({ completed, streak });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update the mission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
