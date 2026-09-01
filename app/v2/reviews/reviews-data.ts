// The colour the "reviews-page" frame (node 163:4) gives each review source,
// read off the frame's own dot assets. The stat cards no longer carry a dot;
// this is what is left of that mapping, used by the log form's source picker.
// The four seeded sources are named explicitly; admins can add more at
// /settings/review-sources, so anything else takes a hashed colour.

const KNOWN: Record<string, string> = {
  Trustpilot: "#22d3ee",
  Google: "#3b82f6",
  HostAdvice: "#a855f7",
  "Gravel Host": "#f59e0b",
};

const DOTS = ["#22d3ee", "#3b82f6", "#a855f7", "#f59e0b", "#8fb0a7"];

export function sourceDot(name: string): string {
  const known = KNOWN[name];
  if (known) return known;

  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % DOTS.length;
  return DOTS[hash];
}
