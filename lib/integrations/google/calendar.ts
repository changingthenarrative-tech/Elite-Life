// Smallest viable Google Calendar read: today's events from the primary calendar.
// Uses the Google OAuth access token that Supabase returns as `provider_token`
// after "Sign in with Google" (with the calendar.readonly scope).

export interface CalendarEvent {
  title: string;
  start: string | null; // ISO datetime, or date for all-day events
  end: string | null;
  location?: string;
  allDay: boolean;
}

export async function getTodaysEvents(
  providerToken: string,
  timeMin: string, // ISO — start of the user's local day
  timeMax: string, // ISO — end of the user's local day
): Promise<CalendarEvent[]> {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "Google authorization expired. Please sign out and sign in again.",
      );
    }
    throw new Error(`Google Calendar request failed (${res.status}).`);
  }

  const data = (await res.json()) as { items?: GoogleEvent[] };

  return (data.items ?? []).map((e) => ({
    title: e.summary?.trim() || "(untitled event)",
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    location: e.location,
    allDay: !e.start?.dateTime, // all-day events use `date`, not `dateTime`
  }));
}

interface GoogleEvent {
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}
