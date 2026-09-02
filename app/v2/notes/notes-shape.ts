// The note shape the v2 pages pass around, plus the search this section exists
// for. Pure: no database, no React, so both the server page and the client list
// can import it.

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId: string | null;
  authorName: string;
  authorImage: string | null;
  when: string;
  /** Null until the note has been edited at least once. */
  editedWhen: string | null;
};

/**
 * The query split into the words that must all appear. Lowercased once here so
 * neither the matcher nor the highlighter repeats the work per note.
 */
export function tokensOf(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

// Title, body and author are all searched: people look for a note by what it
// says as often as by who wrote it.
const haystack = (n: Note) =>
  `${n.title}\n${n.body}\n${n.authorName}`.toLowerCase();

/**
 * Every token has to appear somewhere in the note. Substring rather than fuzzy
 * matching on purpose: documentation is searched for terms someone knows are in
 * it - a plan name, an error string - and a fuzzy match on those returns noise.
 */
export function searchNotes(notes: Note[], tokens: string[]): Note[] {
  if (tokens.length === 0) return notes;
  return notes.filter((n) => {
    const hay = haystack(n);
    return tokens.every((t) => hay.includes(t));
  });
}

export type Segment = { text: string; hit: boolean };

/**
 * Split text into plain and matched runs so the list can mark the matches. Runs
 * are found left to right and overlapping matches are merged, so highlighting
 * "note" and "notes" together marks the longer span once rather than nesting.
 */
export function segmentsFor(text: string, tokens: string[]): Segment[] {
  if (tokens.length === 0 || !text) return [{ text, hit: false }];

  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let from = lower.indexOf(token);
    while (from !== -1) {
      ranges.push([from, from + token.length]);
      from = lower.indexOf(token, from + token.length);
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const out: Segment[] = [];
  let at = 0;
  for (const [start, end] of merged) {
    if (start > at) out.push({ text: text.slice(at, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}

/**
 * The slice of a long note to show while searching: a window around the first
 * match, so a hit buried in a runbook is visible without opening it. Falls back
 * to the head of the body when nothing matches there, which is what happens when
 * the note was matched on its title or author.
 */
export function focusBody(body: string, tokens: string[], radius = 240): string {
  if (body.length <= radius * 2) return body;

  const lower = body.toLowerCase();
  const hit = tokens
    .map((t) => lower.indexOf(t))
    .filter((i) => i !== -1)
    .sort((a, b) => a - b)[0];
  if (hit === undefined) return body;

  // Snap to whitespace so the window does not open mid-word.
  const rawStart = Math.max(0, hit - radius);
  const rawEnd = Math.min(body.length, hit + radius);
  const start = rawStart === 0 ? 0 : body.indexOf(" ", rawStart) + 1 || rawStart;
  const end =
    rawEnd === body.length ? body.length : body.lastIndexOf(" ", rawEnd) || rawEnd;

  return `${start > 0 ? "..." : ""}${body.slice(start, end).trim()}${
    end < body.length ? "..." : ""
  }`;
}

/**
 * "3 notes", "1 note" - the count in the header and beside the search box.
 * Takes the plural where adding an s does not make one ("match"/"matches").
 */
export function countLabel(
  n: number,
  one = "note",
  many = `${one}s`,
): string {
  return `${n} ${n === 1 ? one : many}`;
}
