"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Goal {
  id: string;
  title: string;
  detail: string | null;
  kind: "goal" | "project";
  status: "active" | "stalled" | "done";
  targetDate: string | null;
}

export function GoalsManager() {
  const supabase = createClient();

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<"goal" | "project">("project");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (res.ok) setGoals(data.goals ?? []);
      else setError(data.error ?? null);
    } catch {
      setError("Couldn't load your goals.");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSignedIn(true);
        load();
      } else {
        setSignedIn(false);
      }
    });
  }, [supabase, load]);

  const add = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, detail, kind }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoals(data.goals ?? []);
        setTitle("");
        setDetail("");
      } else {
        setError(data.error ?? "Couldn't save that.");
      }
    } catch {
      setError("Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }, [title, detail, kind]);

  const setStatus = useCallback(
    async (id: string, status: Goal["status"]) => {
      try {
        const res = await fetch("/api/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        const data = await res.json();
        if (res.ok) setGoals(data.goals ?? []);
      } catch {
        setError("Couldn't update that.");
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/goals?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) setGoals(data.goals ?? []);
    } catch {
      setError("Couldn't delete that.");
    }
  }, []);

  const active = goals.filter((g) => g.status !== "done");
  const done = goals.filter((g) => g.status === "done");

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Context
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Goals &amp; Projects
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          What you&apos;re building. Everything else reads this — your brief,
          your mission, and your evening review all get sharper the more
          honestly this is filled in.
        </p>
      </header>

      {signedIn === false && (
        <p className="text-neutral-400">
          Sign in on the{" "}
          <a href="/" className="underline">
            Morning Brief
          </a>{" "}
          first.
        </p>
      )}

      {signedIn && (
        <>
          <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-4">
            <div className="mb-3 flex gap-2">
              {(["project", "goal"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                    kind === k
                      ? "bg-white text-neutral-950"
                      : "border border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "project"
                  ? "e.g. Ship the NextNote Ventures acquisition"
                  : "e.g. Build a business that runs without me"
              }
              className="mb-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              placeholder="Optional: what does progress actually look like?"
              className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
            <button
              onClick={add}
              disabled={saving || !title.trim()}
              className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-60"
            >
              {saving ? "Adding…" : `Add ${kind}`}
            </button>
          </section>

          {error && (
            <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {active.length === 0 && (
            <p className="mb-6 text-sm text-neutral-500">
              Nothing here yet. Add two or three things you&apos;re actually
              working on — that&apos;s what makes the daily brief personal.
            </p>
          )}

          <div className="space-y-3">
            {active.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-neutral-500">
                      {g.kind}
                      {g.status === "stalled" && (
                        <span className="ml-2 text-amber-400">stalled</span>
                      )}
                    </p>
                    <p className="mt-1 leading-relaxed text-neutral-100">
                      {g.title}
                    </p>
                    {g.detail && (
                      <p className="mt-1 text-sm text-neutral-400">{g.detail}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() =>
                      setStatus(g.id, g.status === "stalled" ? "active" : "stalled")
                    }
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-400 transition hover:bg-neutral-800"
                  >
                    {g.status === "stalled" ? "Mark active" : "Mark stalled"}
                  </button>
                  <button
                    onClick={() => setStatus(g.id, "done")}
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-400 transition hover:bg-neutral-800"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => remove(g.id)}
                    className="rounded-lg border border-neutral-800 px-3 py-1.5 text-neutral-600 transition hover:bg-neutral-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {done.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xs uppercase tracking-widest text-neutral-600">
                Completed
              </h2>
              <div className="space-y-2">
                {done.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-900 px-4 py-2"
                  >
                    <span className="text-sm text-neutral-600 line-through">
                      {g.title}
                    </span>
                    <button
                      onClick={() => setStatus(g.id, "active")}
                      className="text-xs text-neutral-600 underline hover:text-neutral-400"
                    >
                      reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer className="mt-auto pt-10 text-xs text-neutral-600">
            <a href="/" className="underline hover:text-neutral-400">
              ← Morning Brief
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
