import Anthropic from "@anthropic-ai/sdk";
import type { CalendarEvent } from "@/lib/integrations/google/calendar";
import type { Goal } from "@/lib/db/goals";

const MODEL = "claude-sonnet-5";

export interface Review {
  wins: string;
  lesson: string;
  tomorrow: string;
}

export interface ReviewResult {
  review: Review;
  raw: string;
  input: string;
  model: string;
}

export interface ReviewContext {
  date: string;
  timezone: string;
  events: CalendarEvent[];
  morningFocus: string | null; // this morning's "one thing", if a brief exists
  reflection: string; // the user's own note (may be empty)
  goals: Goal[];
  missionText: string | null;
  missionCompleted: boolean | null;
}

const SYSTEM_PROMPT = `You are the Evening Review inside a personal operating system.
Help this person close the day with a short, honest reflection and set up tomorrow.

You receive: what they are building (goals and projects), today's calendar, the mission they committed to and whether they completed it, the focus they set this morning, and their own reflection.

Respond with EXACTLY three things:
1. wins - 1-2 sentences on what genuinely moved today, tied to their real goals, projects, or mission. Ground it in evidence; do not inflate or invent.
2. lesson - one honest takeaway or pattern worth carrying forward, in a single sentence.
3. tomorrow - one concrete, specific suggestion for tomorrow's focus, named against their actual goals or projects. Not generic advice.

Rules:
- Be brief, direct, and honest. Do not flatter.
- If they committed to a mission and completed it, acknowledge it plainly. If they did not, be matter-of-fact and constructive, not harsh - and consider whether tomorrow should make it smaller or put it first.
- Never invent events, tasks, or accomplishments not supported by the context.
- If the day was light or the reflection is empty, keep it calm and forgiving rather than manufacturing productivity.
- Respond with ONLY a JSON object, no markdown, no preamble, in this exact shape:
{"wins": "...", "lesson": "...", "tomorrow": "..."}`;

function renderReviewInput(ctx: ReviewContext): string {
  const dateLabel = new Date(ctx.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ctx.timezone,
  });

  const calendar =
    ctx.events.length === 0
      ? "Today's calendar: No scheduled events."
      : "Today's calendar (" + ctx.events.length + "):\n" +
        ctx.events
          .map((e) => {
            if (e.allDay) return "- All day: " + e.title;
            const time = e.start
              ? new Date(e.start).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: ctx.timezone,
                })
              : "";
            return "- " + time + ": " + e.title;
          })
          .join("\n");

  const goals =
    ctx.goals.length === 0
      ? "Goals and projects: none recorded."
      : "What they are building:\n" +
        ctx.goals
          .map((g) => {
            const status = g.status === "stalled" ? " [STALLED]" : "";
            return "- [" + g.kind + "]" + status + " " + g.title;
          })
          .join("\n");

  const missionLine =
    ctx.missionText === null
      ? "Today's mission: none set."
      : "Today's mission: " +
        ctx.missionText +
        " — " +
        (ctx.missionCompleted ? "COMPLETED" : "not completed");

  const focus =
    "This morning's focus: " + (ctx.morningFocus ?? "none recorded");
  const reflection =
    "Their reflection: " +
    (ctx.reflection.trim().length > 0 ? ctx.reflection.trim() : "none provided");

  return (
    "Date: " +
    dateLabel +
    " (" +
    ctx.timezone +
    ")\n\n" +
    goals +
    "\n\n" +
    calendar +
    "\n\n" +
    missionLine +
    "\n\n" +
    focus +
    "\n\n" +
    reflection
  );
}

export async function generateReview(
  ctx: ReviewContext,
): Promise<ReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const anthropic = new Anthropic({ apiKey });
  const input = renderReviewInput(ctx);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: input }],
  });

  const raw = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return { review: parseReview(raw), raw, input, model: MODEL };
}

function parseReview(raw: string): Review {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("The model did not return a parseable review.");
  }

  const parsed = JSON.parse(match[0]) as Partial<Review>;
  if (!parsed.wins || !parsed.lesson || !parsed.tomorrow) {
    throw new Error("The review was missing one of its three parts.");
  }

  return {
    wins: parsed.wins,
    lesson: parsed.lesson,
    tomorrow: parsed.tomorrow,
  };
}
