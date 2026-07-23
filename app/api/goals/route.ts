import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listGoals,
  createGoal,
  updateGoalStatus,
  deleteGoal,
} from "@/lib/db/goals";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const goals = await listGoals(supabase, user.id);
    return NextResponse.json({ goals });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load goals.";
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
    title?: string;
    detail?: string;
    kind?: "goal" | "project";
    targetDate?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  try {
    await createGoal(supabase, user.id, {
      title: body.title.trim(),
      detail: body.detail?.trim() || undefined,
      kind: body.kind ?? "goal",
      targetDate: body.targetDate ?? null,
    });
    const goals = await listGoals(supabase, user.id);
    return NextResponse.json({ goals });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create the goal.";
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

  let body: { id?: string; status?: "active" | "stalled" | "done" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json(
      { error: "An id and status are required." },
      { status: 400 },
    );
  }

  try {
    await updateGoalStatus(supabase, user.id, body.id, body.status);
    const goals = await listGoals(supabase, user.id);
    return NextResponse.json({ goals });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update the goal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "An id is required." }, { status: 400 });
  }

  try {
    await deleteGoal(supabase, user.id, id);
    const goals = await listGoals(supabase, user.id);
    return NextResponse.json({ goals });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete the goal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
