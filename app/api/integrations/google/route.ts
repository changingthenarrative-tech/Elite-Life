import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveGoogleRefreshToken } from "@/lib/db/integrations";

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

  if (!body.refreshToken) {
    return NextResponse.json(
      { error: "No refresh token provided." },
      { status: 400 },
    );
  }

  try {
    await saveGoogleRefreshToken(
      supabase,
      user.id,
      body.refreshToken,
      body.timezone ?? "UTC",
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save integration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
