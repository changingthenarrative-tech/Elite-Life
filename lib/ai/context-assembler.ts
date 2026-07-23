import type { CalendarEvent } from "@/lib/integrations/google/calendar";
import type { EmailSummary } from "@/lib/integrations/google/gmail";
import type { Goal } from "@/lib/db/goals";

// The one seam every feature reads. Each new data source is folded in here,
// and every AI feature gets smarter without changing its own logic.
export interface DailyContext {
  date: string;
  timezone: string;
  eventCount: number;
  events: CalendarEvent[];
  emails: EmailSummary[];
  goals: Goal[];
}

export function assembleContext(
  input: { events: CalendarEvent[]; emails: EmailSummary[]; goals?: Goal[] },
  opts: { date: string; timezone: string },
): DailyContext {
  return {
    date: opts.date,
    timezone: opts.timezone,
    eventCount: input.events.length,
    events: input.events,
    emails: input.emails,
    goals: input.goals ?? [],
  };
}

export function renderContextForModel(ctx: DailyContext): string {
  const dateLabel = new Date(ctx.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ctx.timezone,
  });

  const calendar =
    ctx.eventCount === 0
      ? "Calendar: No scheduled events today."
      : "Calendar (" + ctx.eventCount + " event" + (ctx.eventCount === 1 ? "" : "s") + "):\n" +
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
            const where = e.location ? " @ " + e.location : "";
            return "- " + time + ": " + e.title + where;
          })
          .join("\n");

  const inbox =
    ctx.emails.length === 0
      ? "Inbox: No notable unread emails."
      : "Unread emails (" + ctx.emails.length + "):\n" +
        ctx.emails
          .map((m) => "- From " + m.from + " - " + m.subject + ": " + m.snippet)
          .join("\n");

  const goals =
    ctx.goals.length === 0
      ? "Goals and projects: None recorded yet. (The user has not told the system what they are building.)"
      : "What this person is building (their goals and active projects):\n" +
        ctx.goals
          .map((g) => {
            const status = g.status === "stalled" ? " [STALLED]" : "";
            const due = g.targetDate ? " (target " + g.targetDate + ")" : "";
            const detail = g.detail ? " — " + g.detail : "";
            return (
              "- [" + g.kind + "]" + status + " " + g.title + due + detail
            );
          })
          .join("\n");

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
    inbox
  );
}
