import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export interface MissionProposal {
  mission: string;
  raw: string;
  input: string;
  model: string;
}

const SYSTEM_PROMPT = `You are the mission proposer inside a personal operating system.
Propose the SINGLE most important thing this person should commit to today - the one mission that, if completed, would make today a genuine success.

You receive: what this person is building (their goals and active projects), today's calendar, their inbox, and a summary of their recent execution.

Propose ONE mission:
- SPECIFIC to this person. Name the actual goal, project, deliverable, person, or task. Never generic productivity advice - "block a deep work session", "tackle something you've been putting off", or "complete one substantive piece of work" are FAILURES. If you find yourself writing a mission that could apply to any person on earth, you have not used the context.
- Concrete and completable in a single day, so they can honestly mark it done tonight.
- Prioritise like a world-class chief of staff: what most moves their stated goals forward, balanced against anything genuinely time-sensitive today. A STALLED project is a strong candidate. A real deadline beats a nice-to-have.
- Let recent execution inform the choice (repeated misses on something suggest it needs to go first, or be made smaller), but never mention streaks or history in the mission text.
- If no goals are recorded, propose the most useful concrete action available from the calendar and inbox, and keep it small and honest rather than inventing ambition.

Respond with ONLY a JSON object, no markdown, no preamble, in this exact shape:
{"mission": "..."}`;

export async function proposeMission(args: {
  renderedContext: string;
  executionSummary: string;
}): Promise<MissionProposal> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const anthropic = new Anthropic({ apiKey });
  const input =
    args.renderedContext + "\n\nRecent execution:\n" + args.executionSummary;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: input }],
  });

  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { mission: parseMission(raw), raw, input, model: MODEL };
}

function parseMission(raw: string): string {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("The model did not return a parseable mission.");
  }
  const parsed = JSON.parse(match[0]) as { mission?: string };
  if (!parsed.mission) {
    throw new Error("The proposal was missing a mission.");
  }
  return parsed.mission;
}
