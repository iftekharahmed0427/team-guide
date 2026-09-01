// How v2 draws a member where there is no avatar image: a tinted square of
// initials. The frames are consistent about all three of these, so they live
// here rather than being copied into each page that renders a member.

// The muted avatar set the payments, team and audits frames use, picked by name
// so a member keeps the same colour everywhere they appear.
const TINTS = [
  "#a78fb0",
  "#8fa7b0",
  "#8fb0a7",
  "#b08f8f",
  "#b0a78f",
  "#98b08f",
  "#8fb09e",
  "#afa7af",
];

export function tintFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % TINTS.length;
  return TINTS[hash];
}

const ASCII_LETTER = /^[A-Za-z]$/;

// Discord lets a member set their name in the Mathematical Alphanumeric block,
// and one of ours has: the database holds "\u{1D57F}..." where every frame reads
// "Trinity". Those code points carry a compatibility decomposition to a plain
// letter, so map any character that decomposes to exactly one ASCII letter and
// leave everything else alone - "e" plus a combining acute decomposes to two, so
// an accented name keeps its accent, and the trailing symbol survives.
export function plainName(name: string): string {
  return [...name]
    .map((ch) => {
      const decomposed = ch.normalize("NFKD");
      return decomposed.length === 1 && ASCII_LETTER.test(decomposed)
        ? decomposed
        : ch;
    })
    .join("");
}

// Two letters, the way the frames pick them: across words where there are two
// ("Siren Vampy" -> SV), otherwise across an internal capital ("OrewSegs" -> OS,
// "iiYoyo" -> IY). Names with neither fall back to their first two characters.
export function initialsOf(name: string): string {
  const words = plainName(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();

  const word = words[0];
  const inner = word.slice(1).search(/\p{Lu}/u);
  if (inner !== -1) return (word[0] + word[inner + 1]).toUpperCase();
  return word.slice(0, 2).toUpperCase();
}
