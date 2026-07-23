# Elite Life OS — Morning Brief (thinnest slice)

Sign in with Google, press **Generate Brief**, and see a three-line brief built from
your real calendar events for today:

1. **What's ahead** — the shape of your day
2. **The one thing that matters** — your single focus
3. **Set your intention** — a short grounding prompt

Everything is real. Nothing is stubbed. You supply three credentials (Supabase,
Google OAuth, Anthropic) via environment variables.

---

## Definition of done

Sign in → authorize Google Calendar → press **Generate Brief** → read a brief based
on today's actual events.

---

## Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- A free [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project (for Calendar OAuth)
- An [Anthropic API key](https://console.anthropic.com)

---

## 1. Install

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` as you complete the steps below.

## 2. Supabase: database + auth

**a. Create the table (with RLS).**
In the Supabase dashboard → **SQL Editor**, paste the contents of
`supabase/migrations/0001_daily_briefs.sql` and run it.

**b. Get your API keys.**
**Project Settings → API** → copy the Project URL and the `anon` public key into
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**c. Set the redirect URL.**
**Authentication → URL Configuration** → add `http://localhost:3000/auth/callback`
to the redirect allow-list (add your Vercel URL later too).

## 3. Google: Calendar OAuth

**a.** In Google Cloud Console, enable the **Google Calendar API**.

**b.** Create an **OAuth 2.0 Client ID** (type: Web application). Add this
**Authorized redirect URI**:

```
https://YOUR-PROJECT.supabase.co/auth/v1/callback
```

(Supabase handles the Google callback; your app only sees `/auth/callback`.)

**c.** On the OAuth consent screen, add the scope
`.../auth/calendar.readonly`. While the app is in "testing", add your own Google
account as a test user.

**d.** In Supabase → **Authentication → Providers → Google**, paste the Google
**Client ID** and **Client Secret**, and enable the provider.

## 4. Anthropic

Copy your API key into `ANTHROPIC_API_KEY`. The brief uses the `claude-sonnet-5`
model (set in `lib/ai/brief.ts`).

## 5. Run

```bash
npm run dev
```

Open http://localhost:3000 → **Sign in with Google** (approve the calendar
permission) → **Generate Brief**.

---

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (framework auto-detected).
2. Add the four environment variables from `.env.local` in
   **Vercel → Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to
   your production URL.
3. Add your Vercel URL to the Supabase redirect allow-list
   (`https://your-app.vercel.app/auth/callback`).

---

## Deliberately NOT included yet

Per `ROADMAP.md`: no Gmail, health data, habits/streaks, scheduled cron, Evening
Review, AI memory, Notion, native mobile, or SaaS onboarding. This slice exists to
prove one thing — a real brief from your real calendar, in your hands each morning.

## Notes for the next slice

- **Google token lifetime:** the calendar read uses the `provider_token` from your
  current session, which Google expires after ~1 hour. Generating right after
  sign-in always works; persisting the `provider_refresh_token` for background
  refresh is a deliberate next step, not part of this slice.
- **One table, no ORM yet:** a single SQL migration is intentionally thinner than
  wiring up an ORM. Introduce Drizzle when the second table arrives.
