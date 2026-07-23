import Anthropic from "@anthropic-ai/sdk";
import {
  renderContextForModel,
  type DailyContext,
} from "@/lib/ai/context-assembler";

const MODEL = "claude-sonnet-5";

export interface Brief {
  whatsAhead: string;
  oneThing: string;
  intention: string;
}

export interface BriefResult {
  brief: Brief;
  raw: string;
  input: string;
  model: string;
}

const SYSTEM_PROMPT = `You are the Morning Brief inside a personal operating system.
Your job is to reduce decision fatigue and help the user execute what matters most today.

You receive: what this person is building (their goals and active projects), today's calendar, and any notable unread emails.

Respond with EXACTLY three things:
1. whatsAhead - 1-2 sentences on the shape of the day. Concrete, calm, no filler.
2. oneThing - the single most important thing to focus on today, in one sentence. This is the critical judgement: weigh what moves their actual GOALS and PROJECTS forward against what is genuinely time-sensitive on the calendar or in the inbox. Default to advancing their stated work; let email or meetings override only when something is truly urgent. Name the specific goal, project, or task - never generic advice like "do deep work" or "tackle something important" when you have goals to draw on. If a project is marked STALLED, treat unsticking it as a strong candidate.
3. intention - one short, grounding intention-setting prompt (a sentence or a question) to set the tone.

Rules:
- Be brief and direct. This is read in under 30 seconds at wake time.
- Be specific to THIS person. Reference their real goals, projects, meetings, or messages by name.
- Never invent events, emails, goals, or commitments that are not in the provided context.
- If no goals are recorded, say so plainly in whatsAhead and keep oneThing modest rather than inventing priorities.
- Treat routine newsletters/promotions as low priority; surface only what a thoughtful chief of staff would flag.
- Respond with ONLY a JSON object, no markdown, no preamble, in this exact shape:
{"whatsAhead": "...", "oneThing": "...", "intention": "..."}`;

export async function generateBrief(ctx: DailyContext): Promise<BriefResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const anthropic = new Anthropic({ apiKey });
  const input = renderContextForModel(ctx);

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

  return { brief: parseBrief(raw), raw, input, model: MODEL };
}

function parseBrief(raw: string): Brief {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("The model did not return a parseable brief.");
  }

  const parsed = JSON.parse(match[0]) as Partial<Brief>;
  if (!parsed.whatsAhead || !parsed.oneThing || !parsed.intention) {
    throw new Error("The brief was missing one of its three parts.");
  }

  return {
    whatsAhead: parsed.whatsAhead,
    oneThing: parsed.oneThing,
    intention: parsed.intention,
  };
}
