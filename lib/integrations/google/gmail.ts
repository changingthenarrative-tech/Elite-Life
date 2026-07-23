export interface EmailSummary {
  from: string;
  subject: string;
  snippet: string;
}

export async function getUnreadHighlights(
  providerToken: string,
  maxResults = 5,
): Promise<EmailSummary[]> {
  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.set("q", "is:unread in:inbox category:primary");
  listUrl.searchParams.set("maxResults", String(maxResults));

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
  });

  if (!listRes.ok) {
    if (listRes.status === 401) {
      throw new Error(
        "Google authorization expired. Please sign out and sign in again.",
      );
    }
    // Scope not granted yet (403) or other error: skip email, do not fail the brief.
    return [];
  }

  const list = (await listRes.json()) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);
  if (ids.length === 0) return [];

  const summaries = await Promise.all(
    ids.map(async (id) => {
      const msgUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
      );
      msgUrl.searchParams.set("format", "metadata");
      msgUrl.searchParams.append("metadataHeaders", "From");
      msgUrl.searchParams.append("metadataHeaders", "Subject");

      const res = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${providerToken}` },
        cache: "no-store",
      });
      if (!res.ok) return null;

      const msg = (await res.json()) as {
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers = msg.payload?.headers ?? [];
      const from =
        headers.find((h) => h.name === "From")?.value ?? "(unknown sender)";
      const subject =
        headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      return {
        from,
        subject,
        snippet: (msg.snippet ?? "").slice(0, 200),
      } as EmailSummary;
    }),
  );

  return summaries.filter((s): s is EmailSummary => s !== null);
}
