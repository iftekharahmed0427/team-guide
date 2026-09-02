// The shape the v2 listing and detail components render, plus the helpers that
// bridge the frames to what the database actually stores.
//
// The frames draw a category pill and a fixed five-category filter rail. Guides
// have a real category - `guide.game` - but news_post does not, only a `tags`
// text array, so for news the first tag stands in and the rail filters by tag
// the way the live /news page does.

export type Post = {
  /** Row id, needed by the edit and delete actions. */
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** TipTap HTML from the editor. Null when the post has no body. */
  html: string | null;
  /** The pill, and the rail row for guides. Null when a post has neither. */
  category: string | null;
  tags: string[];
  author: string;
  /** Short form for the listing cards, e.g. "Aug 12, 2026". */
  date: string;
  /** Long form for the detail header, e.g. "August 12, 2026". */
  dateLong: string;
  /** Long form of updated_at, shown as "Last updated" on the detail rail. */
  updatedLong: string;
};

// The frame's five accent colours. Names the frames happened to use keep the
// colour they were drawn in; anything an admin adds later is assigned one by
// name, so a given value is always the same colour. With 14 games in use the
// palette repeats, which is the frame's palette doing what it can.
//
// `pill` is the listing/detail badge, `hex` the raw value for the small swatch
// dots the new-post frame draws in its Manage Categories list.
const PALETTE = [
  { hex: "#8fb0a7", pill: "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]" },
  { hex: "#38bdf8", pill: "bg-[#38bdf8]/[0.12] text-[#38bdf8]" },
  { hex: "#f59e0b", pill: "bg-[#f59e0b]/[0.12] text-[#f59e0b]" },
  { hex: "#c084fc", pill: "bg-[#c084fc]/[0.12] text-[#c084fc]" },
  { hex: "#f472b6", pill: "bg-[#f472b6]/[0.12] text-[#f472b6]" },
];

const NAMED: Record<string, number> = {
  processes: 0,
  guidelines: 1,
  scripts: 2,
  copyright: 3,
  promotions: 4,
};

function indexFor(name: string): number {
  const named = NAMED[name.toLowerCase()];
  if (named !== undefined) return named;
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % PALETTE.length;
  return hash;
}

export const pillFor = (name: string): string => PALETTE[indexFor(name)].pill;

/** The palette itself, for pickers that let someone choose a colour. */
export const PALETTE_COLOURS: readonly { hex: string; pill: string }[] = PALETTE;

export const swatchFor = (name: string): string => PALETTE[indexFor(name)].hex;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// UTC getters, matching the live pages: the stored timestamps are UTC and a
// local-time read would shift dates by a day either side of midnight.
export function longDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function shortDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";
