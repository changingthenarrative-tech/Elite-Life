"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Brief {
  whatsAhead: string;
  oneThing: string;
  intention: string;
}

interface Mission {
  mission: string;
  completed: boolean;
}

type Status = "loading" | "signedOut" | "ready" | "generating";

function localDayStartIso(): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
}

function localDateStr(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function MorningBrief() {
  const supabase = createClient();

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily Mission state
  const [missionLoaded, setMissionLoaded] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [missionText, setMissionText] = useState("");
  const [streak, setStreak] = useState(0);
  const [savingMission, setSavingMission] = useState(false);
  const [togglingMission, setTogglingMission] = useState(false);
  const [proposing, setProposing] = useState(false);

  const loadTodaysBrief = useCallback(async () => {
    setLoadingBrief(true);
    try {
      const res = await fetch(
        `/api/brief?since=${encodeURIComponent(localDayStartIso())}`,
      );
      const data = await res.json();
      if (res.ok && data.brief) {
        setBrief(data.brief);
        setGeneratedAt(data.generatedAt ?? null);
      }
    } catch {
      // Non-fatal.
    } finally {
      setLoadingBrief(false);
    }
  }, []);

  const loadMission = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/mission?date=${localDateStr()}&since=${encodeURIComponent(
          localDayStartIso(),
        )}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMission(data.mission ?? null);
        setStreak(data.streak ?? 0);
        if (!data.mission && data.suggested) {
          setMissionText(data.suggested);
        }
      }
    } catch {
      // Non-fatal.
    } finally {
      setMissionLoaded(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        setStatus("ready");
        loadTodaysBrief();
        loadMission();
      } else {
        setStatus("signedOut");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? null);
        setStatus((s) => (s === "signedOut" || s === "loading" ? "ready" : s));
      } else {
        setEmail(null);
        setBrief(null);
        setGeneratedAt(null);
        setMission(null);
        setStatus("signedOut");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase, loadTodaysBrief, loadMission]);

  const signIn = useCallback(async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes:
          "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly",
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const generate = useCallback(async () => {
    setError(null);
    setStatus("generating");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;
    if (!providerToken) {
      setError(
        "Google access wasn't found. Please sign out and sign in again to authorize it.",
      );
      setStatus("ready");
      return;
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerToken,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setBrief(data.brief);
      setGeneratedAt(data.generatedAt);
      // A fresh brief means a fresh suggested mission, if none is set yet.
      if (!mission && data.brief?.oneThing) {
        setMissionText(data.brief.oneThing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStatus("ready");
    }
  }, [supabase, mission]);

  const saveMission = useCallback(async () => {
    if (!missionText.trim()) return;
    setSavingMission(true);
    try {
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: localDateStr(), mission: missionText }),
      });
      const data = await res.json();
      if (res.ok) {
        setMission(data.mission ?? null);
        setStreak(data.streak ?? 0);
      }
    } catch {
      // Non-fatal.
    } finally {
      setSavingMission(false);
    }
  }, [missionText]);

  const toggleComplete = useCallback(async () => {
    if (!mission) return;
    setTogglingMission(true);
    const next = !mission.completed;
    try {
      const res = await fetch("/api/mission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: localDateStr(), completed: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setMission({ ...mission, completed: next });
        setStreak(data.streak ?? streak);
      }
    } catch {
      // Non-fatal.
    } finally {
      setTogglingMission(false);
    }
  }, [mission, streak]);

  const proposeMissionForToday = useCallback(async () => {
    setError(null);
    setProposing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      if (!providerToken) {
        setError(
          "Google access wasn't found. Please sign out and sign in again.",
        );
        return;
      }

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch("/api/mission/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerToken,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          timezone,
          date: localDateStr(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.mission) {
        setMissionText(data.mission);
      } else if (!res.ok) {
        setError(data.error ?? "Couldn't propose a mission.");
      }
    } catch {
      setError("Couldn't propose a mission.");
    } finally {
      setProposing(false);
    }
  }, [supabase]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          {today}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Morning Brief
        </h1>
      </header>

      {status === "loading" && <p className="text-neutral-500">Loading…</p>}

      {status === "signedOut" && (
        <div className="flex flex-1 flex-col justify-center">
          <p className="mb-6 text-neutral-400">
            Sign in with Google to build today&apos;s brief from your calendar
            and inbox.
          </p>
          <button
            onClick={signIn}
            className="rounded-xl bg-white px-5 py-3 text-center font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {(status === "ready" || status === "generating") && (
        <>
          <button
            onClick={generate}
            disabled={status === "generating"}
            className="mb-6 rounded-xl bg-white px-5 py-3 text-center font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "generating"
              ? "Generating…"
              : brief
                ? "Refresh Brief"
                : "Generate Brief"}
          </button>

          {loadingBrief && !brief && (
            <p className="mb-6 text-sm text-neutral-500">
              Loading today&apos;s brief…
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {brief && (
            <div className="space-y-5">
              <BriefCard label="What's ahead" body={brief.whatsAhead} />
              <BriefCard
                label="The one thing that matters"
                body={brief.oneThing}
                emphasis
              />
              <BriefCard label="Set your intention" body={brief.intention} />
              {generatedAt && (
                <p className="pt-2 text-xs text-neutral-600">
                  Generated{" "}
                  {new Date(generatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}

          {missionLoaded && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-widest text-neutral-500">
                  Today&apos;s Mission
                </h2>
                {streak > 0 && (
                  <span className="text-xs font-medium text-amber-400">
                    {streak}-day streak
                  </span>
                )}
              </div>

              {mission ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-4">
                  <p
                    className={`leading-relaxed ${
                      mission.completed
                        ? "text-neutral-500 line-through"
                        : "text-neutral-100"
                    }`}
                  >
                    {mission.mission}
                  </p>
                  <button
                    onClick={toggleComplete}
                    disabled={togglingMission}
                    className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                      mission.completed
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        : "bg-white text-neutral-950 hover:bg-neutral-200"
                    }`}
                  >
                    {mission.completed ? "Completed ✓" : "Mark complete"}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-4">
                  <textarea
                    value={missionText}
                    onChange={(e) => setMissionText(e.target.value)}
                    rows={2}
                    placeholder="The one thing you'll commit to today."
                    className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={saveMission}
                      disabled={savingMission || !missionText.trim()}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-60"
                    >
                      {savingMission ? "Saving…" : "Set today's mission"}
                    </button>
                    <button
                      onClick={proposeMissionForToday}
                      disabled={proposing}
                      className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {proposing ? "Thinking…" : "Suggest my mission"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <footer className="mt-auto flex items-center justify-between pt-10 text-xs text-neutral-600">
            <span className="flex gap-3">
              <a href="/goals" className="underline hover:text-neutral-400">
                Goals
              </a>
              <a href="/evening" className="underline hover:text-neutral-400">
                Evening Review →
              </a>
            </span>
            <span>
              {email}
              {" · "}
              <button
                onClick={signOut}
                className="underline hover:text-neutral-400"
              >
                Sign out
              </button>
            </span>
          </footer>
        </>
      )}
    </div>
  );
}

function BriefCard({
  label,
  body,
  emphasis,
}: {
  label: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border px-5 py-4 ${
        emphasis
          ? "border-neutral-700 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900/50"
      }`}
    >
      <h2 className="text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </h2>
      <p
        className={`mt-2 leading-relaxed ${
          emphasis ? "text-lg font-medium text-white" : "text-neutral-200"
        }`}
      >
        {body}
      </p>
    </section>
  );
}
