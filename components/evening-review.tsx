"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Review {
  wins: string;
  lesson: string;
  tomorrow: string;
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

export function EveningReview() {
  const supabase = createClient();

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodaysReview = useCallback(async () => {
    setLoadingReview(true);
    try {
      const res = await fetch(
        `/api/review?since=${encodeURIComponent(localDayStartIso())}`,
      );
      const data = await res.json();
      if (res.ok && data.review) {
        setReview(data.review);
        setGeneratedAt(data.generatedAt ?? null);
      }
    } catch {
      // Non-fatal: the user can still generate a fresh review.
    } finally {
      setLoadingReview(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        setStatus("ready");
        loadTodaysReview();
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
        setReview(null);
        setGeneratedAt(null);
        setStatus("signedOut");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase, loadTodaysReview]);

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
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerToken,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          timezone,
          reflection,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setReview(data.review);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStatus("ready");
    }
  }, [supabase, reflection]);

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
          Evening Review
        </h1>
      </header>

      {status === "loading" && <p className="text-neutral-500">Loading…</p>}

      {status === "signedOut" && (
        <div className="flex flex-1 flex-col justify-center">
          <p className="mb-6 text-neutral-400">
            Sign in with Google to close out your day.
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
          {!review && (
            <div className="mb-6">
              <label className="mb-2 block text-xs uppercase tracking-widest text-neutral-500">
                How did today go? (optional)
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                placeholder="A line or two on the day — what moved, what didn't."
                className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={generate}
            disabled={status === "generating"}
            className="mb-6 rounded-xl bg-white px-5 py-3 text-center font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "generating"
              ? "Reflecting…"
              : review
                ? "Redo Review"
                : "Generate Review"}
          </button>

          {loadingReview && !review && (
            <p className="mb-6 text-sm text-neutral-500">
              Loading today&apos;s review…
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {review && (
            <div className="space-y-5">
              <ReviewCard label="What went well" body={review.wins} />
              <ReviewCard label="The lesson" body={review.lesson} emphasis />
              <ReviewCard label="For tomorrow" body={review.tomorrow} />
              {generatedAt && (
                <p className="pt-2 text-xs text-neutral-600">
                  Reviewed{" "}
                  {new Date(generatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}

          <footer className="mt-auto flex items-center justify-between pt-10 text-xs text-neutral-600">
            <a href="/" className="underline hover:text-neutral-400">
              ← Morning Brief
            </a>
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

function ReviewCard({
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
